/**
 * credentials.js
 * module.exports.CMA_TOKEN = "your cma token";
 * module.exports.SPACE_ID = "your space id";
 * module.exports.CONTENT_TYPE_NAME = "content type to add to";
 * // You can set this to null to push directly to array. By default Contentful sets it to "en-US". Change it to push content to other langs
 * module.exports.DEFAULT_LOCALE = "en-US";
 * // CSV file location
 * module.exports.FILE_PATH = "./resources/animals.csv";
 * // Set this to TRUE to run a dry run
 * module.exports.DRY_RUN = true;
 * // Do you want to create a new environment?
 * // This will remove the EXPERIMENTAL_ENV_NAME environment and create a new one
 * module.exports.OVERRIDE_ENV = false;
 * module.exports.ENV_NAME = "your env name";
 */

const vars = require("./credentials");
let actions;
try {
  actions = require("./actions")
} catch (e) { }
const cma = require("contentful-management");
const fs = require("fs");

const ENVIRONMENT_ID = vars.ENV_NAME;
const ENTRY_ID = vars.CONTENT_TYPE_NAME;
const isDryRun = vars.DRY_RUN;

const waitFor = (time) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, time)
  );

const client = cma.createClient({
  accessToken: vars.CMA_TOKEN,
});

// Better split by comma - https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascript
const splitByComma = (strVal) => strVal.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

function convertCSVToObj(string) {
  var array = string.split("\n");

  var object = [];
  var keys = splitByComma(array[0])
  for (var i = 1; i < array.length; i++) {
    var values = splitByComma(array[i])
    var obj = {};
    for (var j = 0; j < values.length; j++) {
      obj[keys[j].trim()] = values[j].trim();
    }
    object.push(obj);
  }

  return object;
}

(async function () {
  isDryRun && console.log(`✨ Starting Dry run... ✨`);
  await waitFor(2000);
  const data = fs.readFileSync(vars.FILE_PATH, "utf8", function (err, data) {
    if (err) {
      console.log("Error reading file!", vars.FILE_PATH);
    }
  });

  // Convert the CSV to a JavaScript object
  const dataToImport = convertCSVToObj(data);
  let env = undefined;

  if (!isDryRun) {
    // Get the space
    const space = await client.getSpace(vars.SPACE_ID);
    console.log(`👉🏼 Checking to see if ${ENVIRONMENT_ID} environment already exists or not`);
    // Get the environments
    const allEnvs = await space.getEnvironments();
    // Let's create an experimental environment - we don't want to run the migration on master
    // Look for experimental environment
    try {
      const Envs = allEnvs.items.filter((item) => item.sys.id === ENVIRONMENT_ID);
      if (Envs.length) {
        console.log(`👉🏼 ${ENVIRONMENT_ID} environment already exists!`);
        env = await space.getEnvironment(ENVIRONMENT_ID);
        if (vars.OVERRIDE_ENV) {
          console.log(`👉🏼 Overriding ${ENVIRONMENT_ID} environment!`);
          await env.delete();
          // It takes a bit of time to delete an environment
          console.log("💤 Waiting for 5s!");
          await waitFor(5000);
        }
        console.log(`👉🏼 ${ENVIRONMENT_ID} selected`);
      } else {
        console.log(`🚨 ${ENVIRONMENT_ID} environment not found!`);
      }
    } catch (error) {
      console.log(`🚨 ${ENVIRONMENT_ID} environment not found!`);
    }

    if (!env) {
      // Create environment to run migration on
      console.log(`🔥 Creating new ${ENVIRONMENT_ID} environment!`);
      env = await space.createEnvironmentWithId(ENVIRONMENT_ID, { name: ENVIRONMENT_ID });
      // It takes a bit of time to create an environment
      console.log("💤 Waiting for 5s!");
      await waitFor(5000);
    }
  }

  // Let's create entries for each data item
  // and publish them
  let tally = {
    "Success": 0,
    "Failed": 0
  }

  for (const item of dataToImport) {
    let entry;
    let entryToSubmit = {};
    // Automagically uses the keys from the csv header
    Object.keys(item).filter(key => item[key]).map(key => {

      // If any transformations active
      if (actions && actions.transformations) {
        // Transform value
        if (actions.transformations.hasOwnProperty(key)) {
          entryToSubmit[key] = vars.DEFAULT_LOCALE ? { [vars.DEFAULT_LOCALE]: actions.transformations[key](item[key]) } : actions.transformations[key](item[key])
          return;
        }
      }

      entryToSubmit[key] = vars.DEFAULT_LOCALE ? { [vars.DEFAULT_LOCALE]: item[key] } : item[key]
      return;
    })

    if (isDryRun) {
      console.log(`🟡 Content ready to be published:`, entryToSubmit);
      tally.Success++;
    } else {
      try {
        entry = await env.createEntry(ENTRY_ID, {
          fields: entryToSubmit,
        });
        await entry.publish();
        console.log(`✅ Published ${ENTRY_ID}:  `, entryToSubmit);
        tally.Success++;
      } catch (error) {
        console.log(`🚨 Could not publish`, entryToSubmit);
        console.error(error.message)
        tally.Failed++;
      }
    }
  }

  console.table(tally);
  isDryRun && console.log(`✨ Dry run successfully completed ✨`);
})();

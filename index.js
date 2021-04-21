/**
 * credentials.js
 * module.exports.CMA_TOKEN = "your_cma_token;
 * module.exports.SPACE_ID = "your_space_id";
 */

const vars = require("./credentials");
const cma = require("contentful-management");
const fs = require("fs");

const ENVIRONMENT_ID = "experimental";
const ENTRY_ID = "animal";

const waitFor = (time) =>
  new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, time)
  );

const client = cma.createClient({
  accessToken: vars.CMA_TOKEN,
});

function convertCSVToObj(string) {
  var array = string.split("\n");

  var object = [];
  var keys = array[0].split(",");
  for (var i = 1; i < array.length; i++) {
    var values = array[i].split(",");
    var obj = {};
    for (var j = 0; j < values.length; j++) {
      obj[keys[j].trim()] = values[j].trim();
    }
    object.push(obj);
  }

  return object;
}

(async function () {
  const data = fs.readFileSync("./resources/animals.csv", "utf8", function (err, data) {
    if (err) {
      console.log("Error reading file!");
    }
  });

  // Convert the CSV to a JavaScript object
  const dataToImport = convertCSVToObj(data);

  // Get the space
  const space = await client.getSpace(vars.SPACE_ID);
  // Get the environments
  const allEnvs = await space.getEnvironments();

  // Let's create an experimental environment - we don't want to run the migration on master
  // Look for experimental environment
  try {
    const experimentalEnvs = allEnvs.items.filter((item) => item.sys.id === ENVIRONMENT_ID);
    if (experimentalEnvs.length) {
      console.log("👉🏼 Experimental environment already exists!");
      const env = await space.getEnvironment(ENVIRONMENT_ID);
      console.log("👉🏼 Deleting experimental environment!");
      await env.delete();
    }
  } catch (error) {
    console.log("🚨 Experimental environment not found!");
  }

  // It takes a bit of time to delete an environment
  console.log("WAITING!");
  await waitFor(5000);
  console.log("FINISHED WAITING!");

  // Create environment to run migration on
  console.log("🔥 Creating new experimental environment!");
  const newEnv = await space.createEnvironmentWithId(ENVIRONMENT_ID, { name: "experimental" });

  // It takes a bit of time to create an environment
  console.log("WAITING!");
  await waitFor(5000);
  console.log("FINISHED WAITING!");

  // Let's create entries for each data item
  // and publish them
  for (const item of dataToImport) {
    let entry;
    try {
      entry = await newEnv.createEntry(ENTRY_ID, {
        fields: {
          title: {
            "en-US": item.title,
          },
          description: {
            "en-US": item.description,
          },
        },
      });
      console.log(`🚨 Publishing ${ENTRY_ID} entry for ${item.title}`);
      await entry.publish();
    } catch (error) {
      console.log(`🚨 Could not publish ${item.title}!`);
    }
  }
})();

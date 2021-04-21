# How to import a CSV file into Contentful as entries using the Contentful Content Management API and JavaScript

This currently assumes your content type is already set up and ready to import entries.

## Install dependencies

```bash
npm i
```

## Add your Contentful credentials.

Add a credentials.js file at the root of the project with the following:

```javascript
module.exports.CMA_TOKEN = "your_cma_token;
module.exports.SPACE_ID = "your_space_id";
```

## To run this script, navigate to the project root and run:

```bash
node index.js
```

The script will perform the following actions:

1. Read the contents of ./resources/animals.csv
1. Convert the contents of the csv file to an array of JavaScript objects
1. Connect to a Contentful space and get a list of environments
1. Check for an experimental environment and delete and recreate one as necessary
1. For each item in the array, create a new 'animal' entry
1. Publish the entries

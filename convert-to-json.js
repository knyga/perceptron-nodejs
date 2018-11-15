const csv = require('csv-parser');
const fs = require('fs');

const readCSV = location => new Promise(resolve => {
  const results = [];
  fs.createReadStream(__dirname + '/db/input/' + location)
    .pipe(csv({ separator: ',' }))
    .on('data', data => results.push(data))
    .on('end', () => {
      resolve(results);
    });
});
const writeObject = (obj, location) =>
  new Promise(resolve => fs.writeFile(__dirname + '/db/' + location, JSON.stringify(obj), 'utf8', () => resolve()));

(async () => {
  const features = await readCSV('BigDataSchool_features.csv');
  const featuresGrouped = {};
  for(let i=0; i<features.length;i++) {
    const feature = features[i];
    if(!featuresGrouped.hasOwnProperty(feature.ID)) {
      featuresGrouped[feature.ID] = [];
    }

    featuresGrouped[feature.ID].push(feature);
  }

  await writeObject(features, 'features.json');
  await writeObject(featuresGrouped, 'featuresGrouped.json');

  await writeObject(await readCSV('BigDataSchool_test_set.csv'), 'test_set.json');
  await writeObject(await readCSV('BigDataSchool_train_set.csv'), 'train_set.json');
})();
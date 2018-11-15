// I used another app to convert csv to json, to speed up parsing
// const csv = require('csv-parser');
// const fs = require('fs');
//
// const readCSV = location => new Promise(resolve => {
//   const results = [];
//   fs.createReadStream(__dirname + '/db/input/' + location)
//     .pipe(csv({ separator: ',' }))
//     .on('data', data => results.push(data))
//     .on('end', () => {
//       resolve(results);
//     });
// });
// const writeObject = (obj, location) =>
//   new Promise(resolve => fs.writeFile(__dirname + '/db/' + location, JSON.stringify(obj), 'utf8', () => resolve()));
// const csv = require('csv-stringify');
//
//
// (async () => {
//   const features = await readCSV('BigDataSchool_features.csv');
//   const featuresGrouped = {};
//   for(let i=0; i<features.length;i++) {
//     const feature = features[i];
//     if(!featuresGrouped.hasOwnProperty(feature.ID)) {
//       featuresGrouped[feature.ID] = [];
//     }
//
//     featuresGrouped[feature.ID].push(feature);
//   }
//
//   await writeObject(features, 'features.json');
//   await writeObject(featuresGrouped, 'featuresGrouped.json');
//
//   await writeObject(await readCSV('BigDataSchool_test_set.csv'), 'test_set.json');
//   await writeObject(await readCSV('BigDataSchool_train_set.csv'), 'train_set.json');
// })();

const fs = require('fs');
const shuffle = require('shuffle-array');
const {architect: {Perceptron}, methods} = require('neataptic');
const featuresGrouped = require('./db/featuresGrouped.json');
const trainSet = shuffle(require('./db/train_set.json'));
const outputFileName = 'OleksandrKnyga_test.txt';
const testSet = require('./db/test_set.json');

// F23 is always empty
// F24 has no visual correlation with target
// So they would be ignored
const ignoreDataIdsArray = [23, 24];
const getInput = id => {
  const featureGroup = featuresGrouped[id];
  const keys = Object.keys(featureGroup[0]);
  const input = [];
  // I will take average of values per parameter for the period and use it as an input for training
  // to reduce the number of inputs
  // and will be giving a priority to the closest in period time with additional factor
  // Because I know nothing about the information behind input data
  for (let k = 0; k < featureGroup.length; k++) {
    for (let i = 0, j = 0; i < keys.length; i++) {
      const match = /F(\d+)/.exec(keys[i]);
      if (match && !ignoreDataIdsArray.includes(+match[1])) {
        if (!input[j]) {
          input[j] = [];
        }
        input[j].push(featureGroup[k][keys[i]] / featureGroup[k].MONTH_NUM_FROM_EVENT);
        j += 1;
      }
    }
  }
  for (let i = 0; i < input.length; i++) {
    input[i] = input[i].reduce((a, b) => a + b) / input[i].length;
  }

  return input;
};
const convertIdSetToDataSet = set => set.map(({ID, TARGET}) => ({
  input: getInput(ID, ignoreDataIdsArray),
  output: [+TARGET],
}));
const writeCSV = (obj, location) =>
  new Promise(resolve =>
    csv(testSet, {header: true}, (err, data) => {
      fs.writeFile(__dirname + '/' + location, data, 'utf8', () => resolve());
    }));
const train = async network => {
  const options = {
    error: 0.05,
    iterations: 10,
    shuffle: true,
  };
  // Lest split train set on 2 parts so we could evaluate the network
  await network.train(
    convertIdSetToDataSet(trainSet.slice(0, Math.floor(trainSet.length / 2))), options);
  return network.evolve(
    convertIdSetToDataSet(trainSet.slice(Math.ceil(trainSet.length / 2))), options);
};

(async() => {
  const inputsCount = convertIdSetToDataSet(trainSet.slice(0, 1))[0].input.length;
  // const secondLayerSizeProb = Math.random()*0.3 + 0.7;
  const network = Perceptron(inputsCount, Math.floor(inputsCount*0.75), 1);
  const {error} = await train(network);
  // { error: 0.07493532767361685, time: 2018-11-10T21:03:59.693Z }
  console.log({error, time: new Date()});
  for(let i=0; i<testSet.length; i++) {
    testSet[i].TARGET = network.activate(getInput(testSet[i].ID))[0];
  }
  // await writeCSV(testSet, outputFileName);
})();
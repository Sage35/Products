const express = require('express')
// const db = './Server/db.js'
const bodyParser = require('body-parser')
// const morgan = require('morgan');
// const routes = require('./Server/routes')
var neo4j = require('neo4j-driver')

const app = express()
const port = 3000

// app.use(morgan('dev'));
// app.use(express.json());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
// app.use('/products', routes);

var driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'asdf'), { disableLosslessIntegers: true })
var session = driver.session();

app.get('/products', function (req, res) {
  let page = Number(req.query.page) || 1;
  let count = Number(req.query.count) || 5;
  let min = (page*count) - count +1;
  let max = (page*count);
  let products = [];
  session
    .run(`MATCH (p:Product) WHERE p.id>=${min} AND p.id<=${max} RETURN p LIMIT 5`)
    .then((result) => {result.records.forEach((record) => products.push(record._fields[0].properties))})
    .then(() => {res.send(products)})
    .catch((err) => console.log(err))
    .then(() => session.close())
})

app.get('/products/:id', function (req, res) {
  let productId = req.params.id
  let productInfo = {};
  let productFeatures = [];

  session
  .run(`MATCH (p:Product) WHERE p.id=${productId} RETURN p`)
  .then((result) => {productInfo = result.records[0]._fields[0].properties; console.log(productInfo)})
  .then(() => session.run(`MATCH (f:Feature) WHERE f.prodId=${productId} RETURN f.feature, f.value`))
  .then((result) => {result.records.forEach((record) => {
    productFeatures.push({feature: record._fields[0], value:record._fields[1]})
  })})
  .then(() => {productInfo.features = productFeatures; res.send(productInfo)})
  .catch((err) => console.log(err))
  .then(() => session.close())
})

app.get('/products/:id/styles', function (req, res) {
  let productId = req.params.id
  let productStyles = [];
  let styleInfo = {}
  let photos = []
  let skus = {}

  session
  // .run(`MATCH (s:Style) WHERE s.prodId=${productId} RETURN s`)
  // .then((results) => {results.records.forEach((record) => productStyles.push(record._fields[0].properties))})
  .run(`MATCH (p:Product {id:1})--(s:Style) WITH s MATCH (sk:Sku)--(s)--(ph:Photos) RETURN s, sk, ph`)
  .then((results) => {results.records.forEach((record) => console.log(record))})
  // .then(() => session.run(`MATCH (p:Product {id:2})-[:HAS_COLLECTION_OF]-(s:Style)-[:LOOKS_LIKE]-(ph:Photos),(s:Style)-[:IS_AVAILABLE_IN]-(sk:Sku) RETURN s, ph, sk, p`))
  // .then((results) => {console.log(results.records)})
  // .then(() => session.run(`MATCH (f:Feature) WHERE f.prodId=${productId} RETURN f.feature, f.value`))
  // .then((result) => {result.records.forEach((record) => {
  //   productFeatures.push({feature: record._fields[0], value:record._fields[1]})
  // })})
  // .then(() => {productInfo.features = productFeatures; res.send(productInfo)})
  // .catch((err) => console.log(err))
  // .then(() => session.close())

})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

module.exports = app
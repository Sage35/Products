const express = require('express')
const bodyParser = require('body-parser')
const neo4j = require('neo4j-driver')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const app = express()
const port = 4000

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
// app.use('/products', routes);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', `http://${process.env.SERVER_URL}:3000)}`);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  next();
});

var driver = neo4j.driver(`bolt://neo4j`, neo4j.auth.basic('neo4j', 'asdf'), { disableLosslessIntegers: true })
var session = driver.session();

app.get(`/`, (req, res) => {
  res.status(200).send('connected to server!');
});

app.get(`/${process.env.LOADER}`, (req, res) => {
  res.status(200).send(process.env.LOADER)
})

app.get('/products', function (req, res) {
  let page = Number(req.query.page) || 1;
  let count = Number(req.query.count) || 5;
  let min = (page*count) - (count-1);
  let max = (page*count);
  let products = [];
  session
    .run(`MATCH (p:Product) WHERE p.id>=${min} AND p.id<=${max} RETURN p`)
    .then((result) => {result.records.forEach((record) => products.push(record._fields[0].properties))})
    .then(() => {res.send(products)})
    .catch((err) => console.log(err))
})

app.get('/products/:id', function (req, res) {
  let productId = req.params.id
  let productInfo = {};
  let productFeatures = [];
  session
  .run(`MATCH (p:Product) WHERE p.id=${productId} RETURN p`)
  .then((result) => {productInfo = result.records[0]._fields[0].properties})
  .then(() => session.run(`MATCH (f:Feature) WHERE f.prodId=${productId} RETURN f.feature, f.value`))
  .then((result) => {result.records.forEach((record) => {
    productFeatures.push({feature: record._fields[0], value:record._fields[1]})
  })})
  .then(() => {productInfo.features = productFeatures; res.send(productInfo)})
  .catch((err) => console.log(err))
})


app.get('/products/:id/styles', function (req, res) {
  let productId = req.params.id
  let productStyles = [];
  let styleInfo = {styleId: undefined, name: undefined, origPrice: undefined, salePrice: undefined, default: undefined, photos: [], skus:{}}
  session
  .run(`MATCH (s:Style) WHERE s.prodId=${productId} RETURN s`)
  .then((results) => {
    results.records.forEach((record) => productStyles.push(record._fields[0].properties))
    })
  .then(() => session.run(`MATCH (p:Product {id:1})--(s:Style) WITH s MATCH (s)--(ph:Photos) RETURN DISTINCT ph`))
  .then((results) => {
    let stylePhotos = {}
    results.records.forEach((record) => {
      if (stylePhotos[record._fields[0].properties.styleId]) {
        stylePhotos[record._fields[0].properties.styleId].push(record._fields[0].properties)
      } else {
        stylePhotos[record._fields[0].properties.styleId] = [record._fields[0].properties]
      }
    })
    for(styles of productStyles) {
      styles.photos = stylePhotos[styles.id]
    }
  })
  .then (() => session.run(`MATCH (p:Product {id:${productId}})--(s:Style) WITH s MATCH (s)--(sk:Sku) RETURN DISTINCT sk`))
  .then((results) => {
    let styleSku = {};
    results.records.forEach((record) => {
      if (styleSku[record._fields[0].properties.styleId]) {
        styleSku[record._fields[0].properties.styleId].push(record._fields[0].properties)
      } else {
        styleSku[record._fields[0].properties.styleId] = [record._fields[0].properties]
      }
    })
    for(styles of productStyles) {
      styles.skus = styleSku[styles.id]
    }
  })
  .then(() => {res.send(productStyles)})
  .catch((err) => console.log(err))
})


app.get('/products/:id/related', function (req, res) {
  let productId = req.params.id
  let relatedProducts = [];
  session
  .run(`MATCH (p1:Product {id:${productId}})-[:IS_SIMILAR_TO]->(p2:Product) RETURN p2.id`)
  .then((result) => {result.records.forEach((record) => {
    relatedProducts.push(record._fields[0])
  })})
  .then(() => res.send(relatedProducts))
})



app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

module.exports = app
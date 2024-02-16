const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const path = require('path')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
const app = express()
app.use(express.json())

let db = null

// connecting server with dataBase

const intilizeDbAndServer = async () => {
  try {
    db = await open({filename: dbPath, driver: sqlite3.Database})

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB error ${error.message}`)
    process.exit(1)
  }
}
intilizeDbAndServer()

//authinticationToken Function

function authinticationToken(request, response, next) {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (authHeader === jwtToken) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//API 1 POST /login/

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const getSelectQuery = `
  SELECT
    *
  FROM 
   user
  WHERE
   username = '${username}';`

  const dBUser = await db.get(getSelectQuery)

  if (dBUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = bcrypt.compare(password, dBUser.password)
    if (isPasswordMatched === true) {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'qwerty')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

//API 2 GET /states/

app.get('/states/', authinticationToken, async (request, response) => {
  const getStatesQuery = `
   SELECT
    state_id as stateId,
    state_name as stateName,
    population as population
   FROM
    state
  ORDER BY
    state_id;`
  const stateArray = await db.all(getStatesQuery)
  response.send(stateArray)
})

//API 3 GET /states/:stateId/

app.get('/states/:stateId/', authinticationToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
  SELECT
    state_id as stateId,
    state_name as stateName,
    population as population
  FROM
   state
  WHERE
   state_id=${stateId};`
  const state = await db.get(getStateQuery)
  response.send(state)
})

//API 4 POST /districts/

app.post('/districts/', authinticationToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const postDistrictQuery = `
  INSERT INTO 
   district(district_name,state_id,cases,cured,active,deaths)
  VALUES
   ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
  `
  await db.run(postDistrictQuery)
  response.send('District Successfully Added')
})

//API 5 GET /districts/:districtId/

app.get(
  '/districts/:districtId/',
  authinticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrictQuery = `
  SELECT
    district_name as districtName,
    state_id as stateId,
    cases as cases,
    cured as cured,
    active as active,
    deaths as deaths
  FROM
   district
  WHERE
   district_id=${districtId};`
    const district = await db.get(getDistrictQuery)
    response.send(district)
  },
)

// API 6 DELETE /districts/:districtId/

app.delete(
  '/districts/:districtId/',
  authinticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteQuery = `
  DELETE FROM 
   district
  WHERE
   district_id = ${districtId};`
    await db.run(deleteQuery)
    response.send('District Removed')
  },
)

//API 7 PUT /districts/:districtId/

app.put(
  '/districts/:districtId/',
  authinticationToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateQuery = `
  UPDATE
   district
  SET
   district_name = '${districtName}',
   state_id = ${stateId},
   cases = ${cases},
   cured = ${cured},
   active = ${active},
   deaths = ${deaths}
   Where
    district_id = ${districtId};`
    await db.run(updateQuery)
    response.send('District Details Updated')
  },
)

// API 8 /states/:stateId/stats/

app.get(
  '/states/:stateId/stats/',
  authinticationToken,
  async (request, response) => {
    const {stateId} = request.params
    const statsQuery = `
  SELECT
  SUM(cases) as totalCases,
  SUM(cured) as totalCured,
  SUM(active) as totalActive,
  SUM(deaths) as totalDeaths
  FROM
   district
  WHERE
   state_id = ${stateId};`

    const stats = await db.get(statsQuery)
    response.send(stats)
  },
)


module.exports = app

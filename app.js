var createError = require('http-errors');
var express = require('express');
var passport = require('passport');
var session = require('express-session');
const sqlite3 = require('better-sqlite3')
var SQLiteStore = require('better-sqlite3-session-store')(session);
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ini = require('ini');
var fs = require('fs');

var indexRouter = require('./routes/index');

var app = express();

app.disable('x-powered-by');

{
  const pjson = require('./package.json');
  console.log(`this is ${pjson.name} version ${pjson.version}`);
}

function parseCommandLine(args = null) {
  if (!args) {
    args = process.argv.slice(2);
  }
  let result = { };
  
  for (let i = 0; i < args.length; ) {
    if (args[i] == "-c" || args[i] == "--config") {
      result.config = args[i+1];
      i = i+2;
    } else if(args[i] == "--data-dir") {
      result.dataDir = args[i+1];
      i = i+2;
    } else {
      console.log(`Unknown command line argument: ${args[i]}`);
      process.exit(1);
    }
  }

  return result;
}

let cli = parseCommandLine();

let defaultDataDir = path.join(process.cwd(), 'data');
let DataDir = defaultDataDir;
if (process.env.QMLFIDDLE_DATA_DIR) {
  DataDir = process.env.QMLFIDDLE_DATA_DIR;
}
if (cli.dataDir) {
  DataDir = cli.dataDir;
}
if (DataDir != defaultDataDir) {
  if (!fs.existsSync(DataDir)) {
    console.log(`User-specified custom path "${DataDir}" does not exist`);
    process.exit(1);
  }
} else {
  if (!fs.existsSync(DataDir)) {
    fs.mkdirSync(DataDir)
  }
}
console.log(`Data directory is ${DataDir}`);

function parseConf() {
  let confpath = null;
  let custom_path_conf = path.join(DataDir, "conf/app.ini");
  if (fs.existsSync(custom_path_conf)) {
    confpath = custom_path_conf;
  }

  if (cli.config) {
    if (!fs.existsSync(cli.config)) {
      console.log(`User-specified config file "${cli.config}" does not exist`);
      process.exit(1);
    }

    confpath = cli.config;
  }

  if (confpath) {
    console.log(`Reading config from ${confpath}`);
    const text = fs.readFileSync(confpath, 'utf8');
    return ini.parse(text);
  } else {
    return null;
  }
}

const defaultConf = {
  features: {
    uploadEnabled: true
  },
  limits: {
    maxFiddleSize: "32kb"
  }
};

const conf = parseConf();

let hashingSalt = "J-type 327 Nubian";
if (conf?.hashingSalt) {
  hashingSalt = conf.hashingSalt;
} else if (process.env.QMLFIDDLE_HASHING_SALT) {
  hashingSalt = process.env.QMLFIDDLE_HASHING_SALT;
}
console.log(`hashingSalt = ${hashingSalt}`);
app.locals.hashingSalt = hashingSalt;

let uploadEnabled = true;
if (conf?.features?.upload != undefined) {
  uploadEnabled = conf.features.upload
}

function parseMaxFiddleSize(value)  {
  if (typeof value == 'number') {
    return value;
  }

  if (value.endsWith('kb')) {
    return parseInt(value.substring(0, value.length - 2)) * 1024;
  } else if (value.endsWith('b')) {
    return parseInt(value.substring(0, value.length - 1));
  } else {
    const r = parseInt(value);
    console.assert(r != NaN, "invalid value for conf field maxFiddleSize");
    return r;
  }
}

app.locals.conf = {
  features: {
    uploadEnabled: uploadEnabled
  },
  limits: {
    maxFiddleSize: parseMaxFiddleSize(conf?.limits?.maxFiddleSize ?? defaultConf.limits.maxFiddleSize)
  }
};

if (app.locals.conf.features.uploadEnabled) {
  console.log("fiddle upload is enabled");
}

if (app.locals.conf.limits.maxFiddleSize > 0) {
  console.log(`maxFiddleSize = ${app.locals.conf.limits.maxFiddleSize}`);
}

const { getOrCreateFiddleDatabase } = require("./src/db");
const db = getOrCreateFiddleDatabase(DataDir);

function setupFiddleManager(instance, conf) {
  if (conf?.fiddles?.maxFiddleId) {
    instance.maxFiddleId = parseInt(conf.fiddles.maxFiddleId);
  }
  if (conf?.fiddles?.firstUserFiddleId) {
    instance.userMinFiddleId = parseInt(conf.fiddles.firstUserFiddleId);
  }
}

const FiddleManager = require("./src/fiddlemanager");
app.locals.fiddleManager = new FiddleManager(db);
setupFiddleManager(app.locals.fiddleManager, conf);
app.locals.fiddleManager.loadFiddlesFromDirectory(path.join(__dirname, "examples"));

const UserManager = require("./src/usermanager");
let users = new UserManager(db);
if (conf?.crypto?.pbkdf2Iterations) {
  users.pbkdf2Iterations = parseInt(conf.crypto.pbkdf2Iterations);
}
app.locals.userManager = users;
// create admin user if it does not exist
if (conf.admin && conf.admin.email && conf.admin.password) {
  if (!users.hasUser(conf.admin.email)) {
    users.createSuperUser(conf.admin.email, conf.admin.password);
  }
}

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

let sessionDb = new sqlite3(path.join(DataDir, 'sessions.db'));
let sessionStore =  new SQLiteStore({
  client: sessionDb, 
  expired: {
    clear: true,
    intervalMs: 900000 //ms = 15min
  }
});

let sessionSecret = null;
if (process.env.QMLFIDDLE_SESSION_SECRET) {
  sessionSecret = process.env.QMLFIDDLE_SESSION_SECRET;
}
if(conf?.crypto?.sessionSecret) {
  sessionSecret = conf.crypto.sessionSecret;
}

if (sessionSecret == null) {
  throw "a session secret must be provided";
}

app.set('trust proxy', 1) // trust first proxy
app.use(session({
  name: 'sessionId',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: sessionStore
}));
app.use(passport.authenticate('session'));
var { router, setupPassport } = require('./routes/auth');
setupPassport(users);

var apiRouter = require('./routes/api');
app.use('/api', apiRouter);
app.get('/ip', (request, response) => response.send(request.ip));
app.use('/', router);
app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

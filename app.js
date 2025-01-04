var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var ini = require('ini');
var fs = require('fs');

var indexRouter = require('./routes/index');

var app = express();

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

app.locals.uploadEnabled = uploadEnabled;
if (app.locals.uploadEnabled) {
  console.log("fiddle upload is enabled");
}

const { getOrCreateFiddleDatabase } = require("./src/db");
const db = getOrCreateFiddleDatabase(DataDir);

const FiddleManager = require("./src/fiddlemanager");
app.locals.fiddleManager = new FiddleManager(db);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));

var apiRouter = require('./routes/api');
app.use('/api', apiRouter);
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

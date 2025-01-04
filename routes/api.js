
const Database = require('better-sqlite3');

var express = require('express');

var fs = require('fs');

function GetSiteInfo(req, res, next) {
  res.json({
    //'baseUrl': req.app.locals.site.baseUrl // TODO: remove me ?
    baseUrl: "qmlfiddle.net"
  });
}

function UploadFiddle(req, res, next) {
  let title = req.body?.title;
  let content = req.body.content;
  let hash = req.body.hash;
  let id = req.body.id ?? "";

  if (!hash) {
    return res.json({
      accepted: false,
      message: "missing hash"
    });
  }

  const crypto = require('crypto')
  let shasum = crypto.createHash('sha1');
  shasum.update(content);
  shasum.update(req.app.locals.hashingSalt);
  const sha1 = shasum.digest('hex');
  console.log(sha1);

  const accepted = sha1 == hash;

  if (!accepted) {
    return res.json({
      accepted: false
    });
  }

  let result = {
    accepted: true
  };

  if (id != "") {
    const updated = req.app.locals.fiddleManager.updateFiddle(id, title, content);
    if (!updated) {
      return res.json({
        accepted: false,
        message: "no such fiddle"
      });
    }
  } else {
    id = req.app.locals.fiddleManager.createFiddle(title, content);
  }
  result.fiddleId = id;

  return res.json(result);
}

var router = express.Router();

router.get('/site/info', GetSiteInfo);
router.post('/fiddle', UploadFiddle);


module.exports = router;

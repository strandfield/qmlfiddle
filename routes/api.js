
const Database = require('better-sqlite3');

var express = require('express');

var fs = require('fs');

function GetSiteInfo(req, res, next) {
  res.json({
    //'baseUrl': req.app.locals.site.baseUrl // TODO: remove me ?
    baseUrl: "qmlfiddle.net"
  });
}

function PostFiddle(req, res, next) {
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

  const accepted = sha1 == hash;

  if (!accepted) {
    return res.json({
      accepted: false
    });
  }

  let result = {
    accepted: true
  };

  const manager = req.app.locals.fiddleManager;

  if (id != "") 
  {
    const edit_key = manager.getFiddleEditKey(id);
    if (!edit_key) {
      return res.json({
        accepted: false,
        message: "no such fiddle"
      });
    }

    if (req.body.editKey != edit_key) {
      return res.json({
        accepted: false,
        message: "invalid or missing edit key"
      });
    }

    const fiddle = manager.updateFiddle(id, title, content);
    console.assert(fiddle != null, "update must no fail");

    result.editKey = manager.getFiddleEditKey(fiddle);
  } 
  else 
  {
    let fiddle = manager.createFiddle(title, content);
    id = fiddle.id.toString(16);
    result.editKey = manager.getFiddleEditKey(fiddle);
  }
  result.fiddleId = id;

  return res.json(result);
}

var router = express.Router();

router.get('/site/info', GetSiteInfo);
router.post('/fiddle', PostFiddle);


module.exports = router;

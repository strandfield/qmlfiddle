
var express = require('express');

const { getUserMaxFiddleSize } = require("../src/utils")


function GetSiteInfo(req, res, next) {
  res.json({
    features: {
      upload: req.app.locals.conf.features.uploadEnabled
    },
    fiddles: req.app.locals.conf.fiddles
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

  // TODO: put max_title_length in conf
  const max_title_length = 256;
  if (title && title.length > max_title_length) {
    title = title.substring(0, max_title_length);
  }

  if (!content) {
    return res.json({
      accepted: false,
      message: "missing content"
    });
  }

  const max_length = getUserMaxFiddleSize(req.user, req.app.locals.conf);
  if (max_length > 0 && content.length > max_length) {
    return res.json({
      accepted: false,
      message: "fiddle too big"
    });
  }

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
    if (!req.app.locals.conf.features.uploadEnabled) {
      return res.json({
        accepted: false,
        message: "no new fiddle can be created"
      });
    }

    let fiddle = manager.createFiddle(title, content);
    if (fiddle && req.user) {
      manager.setFiddleAuthorId(fiddle.id, req.user.id);
    }
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

const Base64 = require("js-base64");

module.exports = {
  "/": async ({ req, res, request }) => {
    const { songmid, raw } = req.query;

    if (!songmid) {
      return res.send({
        result: 500,
        errMsg: "songmid 不能为空",
      });
    }

    const result = await request({
      url: "http://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg",
      data: {
        songmid,
        pcachetime: new Date().getTime(),
        g_tk: 5381,
        loginUin: 0,
        hostUin: 0,
        inCharset: "utf8",
        outCharset: "utf-8",
        notice: 0,
        platform: "yqq",
        needNewCode: 0,
      },
      headers: {
        Referer: "https://y.qq.com",
      },
    });

    if (result.lyric) {
      result.lyric = Base64.Base64.decode(result.lyric);
    }

    if (result.trans) {
      result.trans = Base64.Base64.decode(result.trans || "");
    }
    if (Number(raw)) {
      res.send(result);
    } else {
      res.send({
        result: 100,
        data: result,
      });
    }
  },
};

const search = require("./search");
const getSign = require("../util/sign");

const song = {
  "/": async ({ req, res, request }) => {
    const url = "http://u.y.qq.com/cgi-bin/musicu.fcg";
    const { songmid, raw } = req.query;

    if (!songmid) {
      return res.send({
        result: 500,
        errMsg: "songmid 不能为空",
      });
    }
    const data = {
      data: JSON.stringify({
        songinfo: {
          method: "get_song_detail_yqq",
          module: "music.pf_song_detail_svr",
          param: {
            song_mid: songmid,
          },
        },
        songinfo_app: {
          method: "get_song_detail",
          module: "music.pf_song_detail_svr",
          param: {
            song_mid: songmid,
          },
        },
      }),
    };

    const result = await request({ url, data });

    if (Number(raw)) {
      return res.send(result);
    }

    res &&
      res.send({
        result: 100,
        data: {
          ...result.songinfo.data,
          info_app: result.songinfo_app.data?.info,
        },
      });
  },

  "/batch": async ({ req, res }) => {
    const { songmids } = req.query;
    if (!songmids) {
      return res.send({
        result: 500,
        errMsg: "songmids 不能为空",
      });
    }
    const midArr = songmids.split(",");
    const resultObj = {};
    let count = 0;
    const finishCb = () => {
      if (count !== midArr.length) return;

      res.send({
        result: 100,
        data: resultObj,
      });
    };
    midArr.forEach((mid) => {
      song["/"]({ query: { songmid: mid } }).then(
        (res) => {
          resultObj[mid] = res;
          count += 1;
          finishCb();
        },
        (err) => {
          count += 1;
          finishCb();
        }
      );
    });
  },

  "/finds": async ({ req, res }) => {
    const { data } = req.body;
    const keys = Object.keys(data);

    let count = 0;
    for (let i = 0; i < keys.length; i++) {
      search["/"]({ key: data[keys[i]] }).then(
        (result) => {
          data[keys[i]] = result.data || {};
          count += 1;

          if (count === keys.length) {
            res.send({
              result: 100,
              data,
            });
          }
        },
        (err) => {
          data[keys[i]] = {};
          count += 1;

          if (count === keys.length) {
            res.send({
              result: 100,
              data,
            });
          }
        }
      );
    }
  },

  "/url": async ({ req, res, request, cache, globalCookie }) => {
    const obj = { ...req.query, ...req.body };
    let { uin, qqmusic_key } = globalCookie.userCookie();
    if (Number(obj.ownCookie)) {
      uin = req.cookies.uin || uin;
    }

    const { id, isRedirect = "0" } = obj;
    if (!id) {
      return res.send({
        result: 500,
        errMsg: "id ?",
      });
    }
    const guid = (Math.random() * 10000000).toFixed(0);

    let purl = "";
    let domain = "";
    const result = await request({
      url: "https://u.y.qq.com/cgi-bin/musicu.fcg",
      method: "post",
      data: JSON.stringify({
        comm: {
          cv: 4747474,
          ct: 24,
          format: "json",
          inCharset: "utf-8",
          outCharset: "utf-8",
          notice: 0,
          platform: "yqq.json",
          needNewCode: 1,
          uin: uin,
        },
        req_0: {
          module: "vkey.GetVkeyServer",
          method: "CgiGetVkey",
          param: {
            guid: guid,
            songmid: [id],
            songtype: [0],
            uin: uin,
            loginflag: 1,
            platform: "20",
          },
        },
      }),
      headers: {
        Referer: "https://y.qq.com",
      },
    });
    if (res && !result.req_0.data) {
      return res.send({
        result: 400,
        errMsg: "获取链接出错，建议检查是否携带 cookie ",
      });
    }
    if (result.req_0 && result.req_0.data && result.req_0.data.midurlinfo) {
      purl = result.req_0.data.midurlinfo[0].purl;
    }
    if (domain === "") {
      domain =
        result.req_0.data.sip.find((i) => !i.startsWith("http://ws")) ||
        result.req_0.data.sip[0];
    }
    if (!purl) {
      return res.send({
        result: 400,
        errMsg: "获取播放链接出错",
      });
    }

    if (Number(isRedirect)) {
      return res.redirect(`${domain}${purl}`);
    }

    cacheData = {
      data: `${domain}${purl}`,
      result: 100,
    };
    res.send(cacheData);
  },

  "/urls": async ({ req, res, request, globalCookie, cache }) => {
    const obj = { ...req.query, ...req.body };
    let uin = globalCookie.userCookie().uin;

    if (Number(obj.ownCookie)) {
      uin = req.cookies.uin || uin;
    }

    const { id = "" } = obj;
    const idArr = id.split(",");
    let count = 0;
    const idStr = idArr.map((id) => `"${id}"`).join(",");

    let cacheKey = `song_url_${idStr}`;
    let cacheData = cache.get(cacheKey);
    if (cacheData) {
      return res.send(cacheData);
    }
    let url = `https://u.y.qq.com/cgi-bin/musicu.fcg?-=getplaysongvkey2682247447678878&g_tk=5381&loginUin=${uin}&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.json&needNewCode=0&data=%7B"req_0"%3A%7B"module"%3A"vkey.GetVkeyServer"%2C"method"%3A"CgiGetVkey"%2C"param"%3A%7B"guid"%3A"2796982635"%2C"songmid"%3A%5B${idStr}%5D%2C"songtype"%3A%5B0%5D%2C"uin"%3A"${uin}"%2C"loginflag"%3A1%2C"platform"%3A"20"%7D%7D%2C"comm"%3A%7B"uin"%3A${uin}%2C"format"%3A"json"%2C"ct"%3A24%2C"cv"%3A0%7D%7D`;
    let isOk = false;
    let result = null;

    const reqFun = async () => {
      count += 1;
      result = await request(url);
      if (result.req_0.data.testfile2g) {
        isOk = true;
      }
    };

    while (!isOk && count < 5) {
      await reqFun().catch(() => (count += 1));
    }

    if (!result || !result.req_0) {
      return res.send({
        result: 200,
        errMsg: "获取链接失败，建议检查是否登录",
      });
    }

    const domain =
      result.req_0.data.sip.find((i) => !i.startsWith("http://ws")) ||
      result.req_0.data.sip[0];

    // domain = 'http://122.226.161.16/amobile.music.tc.qq.com/';

    const data = {};
    result.req_0.data.midurlinfo.forEach((item) => {
      if (item.purl) {
        data[item.songmid] = `${domain}${item.purl}`;
      }
    });

    cacheData = {
      data,
      result: 100,
    };
    res.send(cacheData);
    cache.set(cacheKey, cacheData);
  },

  // 相似歌曲
  "/similar": async ({ req, res, request }) => {
    const { id, raw } = req.query;
    if (!id) {
      return res.send({
        result: 500,
        errMsg: "id ?",
      });
    }
    const result = await request(
      {
        url: "http://u.y.qq.com/cgi-bin/musicu.fcg",
        data: JSON.stringify({
          comm: {
            g_tk: 5381,
            format: "json",
            inCharset: "utf-8",
            outCharset: "utf-8",
            notice: 0,
            platform: "h5",
            needNewCode: 1,
          },
          simsongs: {
            module: "rcmusic.similarSongRadioServer",
            method: "get_simsongs",
            param: {
              songid: Number(id),
            },
          },
        }),
        method: "post",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      {
        dataType: "raw",
      }
    );

    if (Number(raw)) {
      return res.send(result);
    }
    return res.send({
      result: 100,
      data: result.simsongs.data.songInfoList,
    });
  },

  "/topdata": async ({ req, res, request }) => {
    const { id, raw } = req.query;
    if (!id) {
      return res.send({
        result: 500,
        errMsg: "id ?",
      });
    }
    const data = {
      comm: {
        g_tk: 5381,
        format: "json",
        inCharset: "utf-8",
        outCharset: "utf-8",
        notice: 0,
        platform: "h5",
        needNewCode: 1,
      },
      req_0: {
        module: "music.musicToplist.PlayToplist",
        method: "GetPlayTopData",
        param: {
          songMidList: [id],
          requireSongInfo: 1,
        },
      },
    };
    const sign = getSign(data);
    const result = await request(
      {
        url: `http://u6.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`,
        data: JSON.stringify(data),
        method: "post",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      {
        dataType: "raw",
      }
    );

    if (Number(raw)) {
      return res.send(result);
    }
    return res.send({
      result: 100,
      data: result.req_0.data?.data ? result.req_0.data?.data[id] : null,
    });
  },

  // 相关歌单
  "/playlist": async ({ req, res, request }) => {
    const { id, raw } = req.query;
    if (!id) {
      return res.send({
        result: 500,
        errMsg: "id ?",
      });
    }
    const result = await request(
      {
        url: "http://u.y.qq.com/cgi-bin/musicu.fcg",
        data: JSON.stringify({
          comm: {
            g_tk: 5381,
            format: "json",
            inCharset: "utf-8",
            outCharset: "utf-8",
            notice: 0,
            platform: "h5",
            needNewCode: 1,
          },
          gedan: {
            module: "music.mb_gedan_recommend_svr",
            method: "get_related_gedan",
            param: {
              sin: 0,
              last_id: 0,
              song_type: 1,
              song_id: Number(id),
            },
          },
        }),
        method: "post",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      {
        dataType: "raw",
      }
    );

    if (Number(raw)) {
      return res.send(result);
    }
    return res.send({
      result: 100,
      data: result.gedan.data.vec_gedan,
    });
  },

  // 相关 mv
  "/mv": async ({ req, res, request }) => {
    const { id, raw } = req.query;
    if (!id) {
      return res.send({
        result: 500,
        errMsg: "id ?",
      });
    }
    const result = await request(
      {
        url: "http://u.y.qq.com/cgi-bin/musicu.fcg",
        data: JSON.stringify({
          comm: {
            g_tk: 5381,
            format: "json",
            inCharset: "utf-8",
            outCharset: "utf-8",
            notice: 0,
            platform: "h5",
            needNewCode: 1,
          },
          video: {
            module: "MvService.MvInfoProServer",
            method: "GetSongRelatedMv",
            param: {
              songid: id,
              songtype: 1,
              lastmvid: 0,
              num: 10,
            },
          },
        }),
        method: "post",
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
      {
        dataType: "raw",
      }
    );

    if (Number(raw)) {
      return res.send(result);
    }
    return res.send({
      result: 100,
      data: result.video.data.list,
    });
  },
};
module.exports = song;

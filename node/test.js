const qqMusic = require("./index");

qqMusic
  .api("song/topdata", { id: "0029vb0r2T9PE4" })
  .then((res) => console.log("result", res))
  .catch((err) => console.error("error: ", err.message));

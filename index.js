const express = require('express');
const axios = require('axios');

const app = express();

let sessionId, cookies;

const mainCookie = 'g.a000kAidqTgA8H5MVAExK1idkGiMR1QLxdO91u_jgGhEMO25Lks-_SS3bX8USzO4VC_ONIhrwwACgYKASASARUSFQHGX2Mi7s_Cgb0Ob-keUXVGC5slJRoVAUF8yKrd0zF7mlPMSNN8xveJFo410076'; //change with ur own cookie

class BardAI {
  constructor() {
    this.cookie = mainCookie;
    if (!this.cookie) throw new Error("Session Cookies are missing, Unable to login to an account!");
  }

  async login() {
    cookies = this.cookie;
    let headerParams = {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "Cookie": `__Secure-1PSID=${this.cookie};`
    };
    let instance = axios.create({
      withCredentials: true,
      baseURL: "https://gemini.google.com/",
      headers: headerParams
    });

    try {
      let r = await instance.get();
      sessionId = r.data.match(/SNlM0e":"(.*?)"/g)[0].substr(8).replace(/\"/g, '');
    } catch (e) {
      throw new Error('Unable to login to your account. Please try using new cookies and try again.');
    }
  }
}

let imageFormat = (text, images) => {
  if (!images) return { message: text, imageUrls: [] };
  let formattedText = text.replace(/\[Image of.*?\]/g, '').trim();
  images.forEach(imageData => {
    imageData.tag = imageData.tag.replace(/\[Image of.*?\]/g, "").trim();
  });
  return { message: formattedText, imageUrls: images.map((image) => image.url) };
};

let startBard = async (message) => {
  if (!sessionId) throw new Error('Please initialize login first to use bardai.');
  let postParamsStructure = [
    [message],
    null,
    [],
  ];
  let postData = {
    "f.req": JSON.stringify([null, JSON.stringify(postParamsStructure)]),
    at: sessionId
  };
  let headerParams = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "Cookie": `__Secure-1PSID=${cookies};`
  };

  try {
    let r = await axios({
      method: 'POST',
      url: 'https://gemini.google.com/u/1/_/BardChatUi/data/batchexecute?rpcids=K4WWud&source-path=%2Fu%2F1%2Fapp&bl=boq_assistant-bard-web-server_20240306.14_p1&f.sid=3648944019115611115&hl=vi&_reqid=575433&rt=c',
      headers: headerParams,
      withCredentials: true,
      data: postData
    });
    let bardAIRes = JSON.parse(r.data.split("\n")[3])[0][2];
    if (!bardAIRes) throw new Error(`Bard AI encountered an error ${r.data}.`);
    let bardData = JSON.parse(bardAIRes);
    let bardAI = JSON.parse(bardAIRes)[4][0];
    let result = bardAI[1][0];
    let images = bardAI[4]?.map(e => {
      return {
        url: e[3][0][0],
        tag: e[2],
        source: {
          name: e[1][1],
          original: e[0][0][0],
          website: e[1][0][0],
          favicon: e[1][3]
        }
      };
    });
    return imageFormat(result, images);
  } catch (error) {
    throw new Error(`Bard AI encountered an error ${error.message}.`);
  }
};

app.get('/bard', async (req, res) => {
  const { ask } = req.query;
  try {
    const bard = new BardAI();
    await bard.login();
    const response = await startBard(ask);
    const { message, imageUrls } = response;
    res.json({ message, imageUrls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on Port ${PORT}`);
});
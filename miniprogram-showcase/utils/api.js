const base=()=>getApp().globalData.apiBase.replace(/\/$/,'');
const request=(path,method='GET',data)=>new Promise((resolve,reject)=>wx.request({url:base()+path,method,data,header:{'content-type':'application/json',Authorization:wx.getStorageSync('storeToken')?'Bearer '+wx.getStorageSync('storeToken'):''},success:r=>r.statusCode<300?resolve(r.data):reject(r.data),fail:reject}));
const media=url=>url&&(/^https?:/.test(url)?url:base()+url);
const requireLogin=()=>{if(wx.getStorageSync('storeToken'))return true;wx.reLaunch({url:'/pages/login/login'});return false};
const upload=file=>new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:file,success:({data})=>{const b=new Uint8Array(data),type=b[0]===0x89&&b[1]===0x50?'image/png':b[0]===0x47&&b[1]===0x49?'image/gif':b[0]===0x52&&b[1]===0x49?'image/webp':'image/jpeg';wx.request({url:base()+'/api/upload',method:'POST',data,header:{Authorization:'Bearer '+wx.getStorageSync('storeToken'),'content-type':type},success:r=>r.statusCode<300?resolve(r.data):reject(r.data),fail:reject})},fail:reject}));
module.exports={request,media,requireLogin,upload,base};

const base=()=>getApp().globalData.apiBase.replace(/\/$/,'');
const token=()=>wx.getStorageSync('adminToken');
const request=(path,method='GET',data)=>new Promise((resolve,reject)=>wx.request({url:base()+path,method,data,header:{'content-type':'application/json',Authorization:token()?`Bearer ${token()}`:''},success:r=>r.statusCode<300?resolve(r.data):reject(r.data),fail:reject}));
const media=url=>url&&(/^https?:/.test(url)?url:base()+url);
const upload=file=>new Promise((resolve,reject)=>wx.getFileSystemManager().readFile({filePath:file,success:({data})=>{
 const bytes=new Uint8Array(data),type=bytes[0]===0x89&&bytes[1]===0x50?'image/png':bytes[0]===0x47&&bytes[1]===0x49?'image/gif':bytes[0]===0x52&&bytes[1]===0x49?'image/webp':'image/jpeg';
 wx.request({url:base()+'/api/upload',method:'POST',data,header:{Authorization:`Bearer ${token()}`,'content-type':type},success:r=>r.statusCode>=200&&r.statusCode<300?resolve(r.data):reject(r.data),fail:reject});
},fail:reject}));
module.exports={request,media,upload,base};

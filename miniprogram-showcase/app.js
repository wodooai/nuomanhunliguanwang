// 本机调试地址；正式上线时改为已备案并配置到微信后台的 HTTPS 域名。
App({globalData:{apiBase:"http://127.0.0.1:4188"},onLaunch(options){const ticket=options?.query?.shareTicket,id=options?.query?.caseId;if(ticket&&id)wx.setStorageSync('shared-entry',{ticket,id})}})

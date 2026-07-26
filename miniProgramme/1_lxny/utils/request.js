const baseURL = 'http://8.130.69.72:3000/api/';

export function request(params){
  
  let dataObj = params.data || {};
  let headerObj = {			
    'content-type': 'application/json'    
  }
  
  return new Promise((resolve,reject)=>{
    wx.request({
      url: baseURL + params.url,
      method:params.method || "GET",
      data:dataObj,
      header:headerObj,
      success:res=>{
        resolve(res.data)
      },
      fail:err=>{
        reject(err)
      }
    })
  })
}
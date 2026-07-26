// import axios from 'axios'
// //import { use } from 'echarts'
// import qs from 'qs'
// //可以在config.js文件里面放一些公共变量方便维护
// //import { baseurl } from "../data/运城市.json"
// //添加请求拦截器
// axios.interceptors.request.use(function(config) {

//         return config
//     }, function(error) {
//         return Promise.reject(error)
//     })
//     //添加响应拦截器
// axios.interceptors.response.use(function(response) {
//         return response.data
//     }, function(error) {
//         return Promise.reject(error)
//     })
//     //封装数据返回失败提示函数
// function errorState(response) {
//     if (response && (response.status === 200) || response.status === 304 || response === 400) {
//         return response
//     } else {
//         alert("数据获取错误")
//     }
// }
// //封装数据返回成功提示函数
// function successState(res) {
//     if (res.data === '200') {
//         alert('success')
//         return res
//     }
// }
// //f封装asiox
// function apiAxios(method, url, params) {
//     let httpDefault = {
//         method: method,
//         //baseURL: baseURL,
//         url: url,
//         params: method === 'GET' || method === 'DELETE' ? params : null,
//         data: method === 'POST' || method === 'PUT' ? qs.stringify(params) : null,
//         timeout: 1000
//     }
//     return new Promise((resolve, reject) => {
//         axios(httpDefault).then((res) => {
//             successState(res)
//             resolve(res)
//         }).catch((response) => {
//             errorState(response)
//             reject(response)
//         })
//     })
// }
// export default {
//     //非全局使用
//     //get:(method,url,params)=>apiAxios('get', url, params)

//     install: function(Vue) {
//         //全局使用
//         Vue.prototype.getAxios = (url, params) => apiAxios('GET', url, params)
//         Vue.prototype.postAxios = (url, params) => apiAxios('POST', url, params)
//         Vue.prototype.putAxios = (url, params) => apiAxios('PUT', url, params)
//         Vue.prototype.delectAxios = (url, params) => apiAxios('DELECT', url, params)
//             //非全局使用
//             //get:(method,url,params)=>apiAxios('get', url, params)

//     }
// }
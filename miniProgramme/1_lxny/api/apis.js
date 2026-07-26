import {request} from "../utils/request"
//获取首页导航
//温度1
export function queryTemperature(){
    return request({
        url:"temperature",
        method:"GET"
    })
}
//湿度1
export function queryhumidity(){
    return request({
        url:"humidity",
        method:"GET"
    })
}
//co21
export function queryCO2(){
    return request({
        url:"CO2",
        method:"GET"
    })
}
//甲醛1
export function queryHCHO(){
    return request({
        url:"HCHO",
        method:"GET"
    })
}
//土壤湿度1
export function querysoilhumidity(){
    return request({
        url:"soilhumidity",
        method:"GET"
    })
}
//光照1
export function queryillumination(){
    return request({
        url:"illumination",
        method:"GET"
    })
}
//历史数据
export function queryhistoryData(){
    return request({
        url:"data",
        method:"GET"
    })
}

//获取新闻列表
export function queryNews(data){
    return request({
        url:"news/get",
        // method:"POST",
        data
    })
}
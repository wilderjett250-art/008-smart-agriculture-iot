// pages/news/news.js
import {queryNews, queryTemperature, queryhumidity, queryCO2, queryHCHO, querysoilhumidity, queryillumination} from "../../api/apis"
Page({

    /**
     * 页面的初始数据
     */
    data: {
        newsArr:[],
        temperatureArr:"",
        temperature1:"",
        refreshTime1:""
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        //this.getNewsData()
        this.getTemperatureData();
        this.gethumidityData();
        this.getCO2Data();
        this.getHCHOData();
        this.getsoilhumidityData();
        this.getilluminationData();
    },

    getTemperatureData(){
        queryTemperature().then(res=>{
            this.setData({
                temperatureArr:res[0].time,
                temperature1:res[0].value,
                refreshTime1:res[0].time
            })
        })
    },

    gethumidityData(){
        queryhumidity().then(res=>{
            this.setData({
                humidity1:res[0].value
            })
        })
    },

    getCO2Data(){
        queryCO2().then(res=>{
            this.setData({
                co2_1:res[0].value
            })
        })
    },

    getHCHOData(){
        queryHCHO().then(res=>{
            this.setData({
                formaldehyde1:res[0].value
            })
        })
    },

    getsoilhumidityData(){
        querysoilhumidity().then(res=>{
            this.setData({
                soil_moisture1:res[0].value
            })
        })
    },

    getilluminationData(){
        queryillumination().then(res=>{
            this.setData({
                illumination1:res[0].value
            })
        })
    },
    //获取新闻列表
    // getNewsData(){
    //     queryNews({
    //         limit:8,
    //         size:0
    //     }).then(res=>{
    //         this.setData({
    //             newsArr:res.data
    //         })
    //     })
    // },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})
// pages/classify/classify.js
var mqtt = require("../../utils/mqtt.min")
var client = "256548a66ac9301d57e2b2befc25d443"
Page({

    /**
     * 页面的初始数据
     */
    data: {
        relayStatus:0,
        switchStatus: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        this.connectMqtt()
    },

    connectMqtt:function(){
        var timestamp =Date.parse(new Date());
        const options = {
          connectTimeout:4000,
          clientid:timestamp,
          port:8084,
          username:"256548a66ac9301d57e2b2befc25d443",
          password:"zafu8888"
        }
        client = mqtt.connect("wxs://t.yoyolife.fun/mqtt",options)
        client.on("connect",(e)=>{
          console.log("服务连接成功")
          client.subscribe("/iot/3691/sub/123",{
            qos:0
          },function(err){
            if(!err){
              console.log("订阅成功")
            }
          })
        })
        client.on("message",function(topic, message){
          console.log("收到"+message.toString())
        })
        client.on("reconnect",(error)=>{
          console.log("正在重新连接",error)
        })
        client.on("error",(error)=>{
          console.log("连接失败",error)
        })
    },
    
    relay(){
    if (this.relayStatus==1){
        client.publish("/iot/3691/sub/123","0")
        this.setData({
            relayStatus:0
        })
    }else{
        client.publish("/iot/3691/sub/123","1")
        this.setData({
        relayStatus:1
        })
    }},

    switchChange: function (e) {
        const isChecked = e.detail.value;
        const statusText = isChecked ? "打开了" : "关掉了";
        isChecked ? client.publish("/iot/3691/sub/123","wechaton") : client.publish("/iot/3691/sub/123","wechatoff");
        this.setData({
          switchStatus: isChecked,
        //   statusText: statusText
        });
    },

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
<template>
  <div class="video">
    <div id="video-container"></div>
    <!-- <iframe :src="url" width="100%" height="100%" style="border: none;" id="ysOpenDevice" allowfullscreen></iframe> -->
    <el-button @click="change()" style="align-items: center;">切换回放/直播</el-button>
  </div>
</template>

<script>
import EZUIKit from "ezuikit-js"; // 导入萤石

export default {
  name: 'VideoComponent',
  props:['token'],
  data() {
    return {
      isLive: false,
      player: null,
      videoUrl: 'ezopen://open.ys7.com/AH6685932/1.live', // 视频URL
      videoUrl2: 'ezopen://open.ys7.com/AH6685932/1.rec', // 视频URL
      videoToken: this.token, // accessToken
    };
  },
  mounted() {
    this.initVedio(); // 在组件挂载完成后初始化视频
  },
  methods: {
    initVedio() {
      const videoParent = document.querySelector(".video");
      if (videoParent) {
        const videoContainer = document.createElement("div");
        videoContainer.id = "video-container";
        videoParent.appendChild(videoContainer);
      }

      this.isLive = true;
      this.player = null;

      const width = "700";
      const height = "427";
      const ezopenInit = async () => {
        try {
          this.player = new EZUIKit.EZUIKitPlayer({
            id: "video-container",
            width: width,
            height: height,
            template: "pcLive",
            url: this.videoUrl,
            accessToken: this.videoToken
          });
        } catch (error) {
          console.log("发生错误: " + error);
        }
      };
      ezopenInit().catch(error => {
        console.log("发生错误: " + error.msg);
      });
    },
    ezopenInit() {
      const videoParent = document.querySelector(".video");
      if (videoParent) {
        const videoContainer = document.createElement("div");
        videoContainer.id = "video-container";
        videoParent.appendChild(videoContainer);
      }

      this.isLive = false;
      this.player = null;

      var width = "700";
      var height = "447";
      const ezopenInit = async () => {
        try {
          this.player = new EZUIKit.EZUIKitPlayer({
            id: "video-container",
            width: width,
            height: height,
            template: "pcRec",
            url: this.videoUrl2,
            accessToken: this.videoToken
          });
        } catch (error) {
          console.error("播放器初始化错误:", error);
        }
      };
      ezopenInit().catch(error => {
        console.error('初始化 EZUIKitPlayer 时发生错误:', error);
      });
    },

    //完全关闭modal
    handleAfterClose() {
      //销毁创建的对象，防止出现关闭页面依旧有声音的情况
      if (this.player) {
        this.player.stop().catch(error => {
          console.error('停止播放器时发生错误:', error);
        });
        this.player.destroy();
        this.player = null;
      }

      //将dom移除，下次创建视频对象在创建这个dom,防止第二次打开发现创建了两个视频
      document.getElementById("video-container").innerHTML = "";

      const videoContainer = document.getElementById("video-container");
      videoContainer
        ? videoContainer.parentNode.removeChild(videoContainer)
        : ""; // 从 DOM 中移除 <div> 元素
    },
    change() {

      this.handleAfterClose();
      if (!this.isLive) {
        this.initVedio();
      }
      else {
        this.ezopenInit();
      }
    },
    stop() {
      var stopPromise = this.player.stop();
      stopPromise.then((data) => {
        console.log("promise 获取 数据", data);
      });
    },
  },
};
</script>
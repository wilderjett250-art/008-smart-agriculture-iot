<template>
    <div>
        <video ref="videoPlayer" :src="videoUrl" controls></video>
    </div>
</template>

<script>
import flvjs from 'flv.js';

export default {
    props: {
        videoUrl: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            flvPlayer: null
        };
    },
    mounted() {
        this.initFlvPlayer();
    },
    beforeUnmount() {
        this.destroyFlvPlayer();
    },
    methods: {
        initFlvPlayer() {
            if (flvjs.isSupported()) {
                this.flvPlayer = flvjs.createPlayer({
                    type: 'flv',
                    url: this.videoUrl
                });
                this.flvPlayer.attachMediaElement(this.$refs.videoPlayer);
                this.flvPlayer.load();
                this.flvPlayer.play();
            }
        },
        destroyFlvPlayer() {
            if (this.flvPlayer) {
                this.flvPlayer.unload();
                this.flvPlayer.detachMediaElement();
                this.flvPlayer.destroy();
                this.flvPlayer = null;
            }
        }
    }
};
</script>

<style scoped>
/* Add your custom styles here */
video {
    width: 100%;
    height: 100%;
}
</style>

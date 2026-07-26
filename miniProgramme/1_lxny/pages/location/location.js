// pages/map/marker/marker.js
import {CDN_PATH} from '../../config/appConfig';
const RADIUS = 4;
const INIT_MARKER = {
	callout: {
		content: '智慧试验田',
		padding: 10,
		borderRadius: 2,
		display: 'ALWAYS'
	},
	latitude: 30.238871,
	longitude: 119.729963,
	iconPath: './imgs/Marker1_Activated@3x.png',
	width: '34px',
	height: '34px',
	rotate: 0,
	alpha: 1
};
const INIT_CALLOUT = {
	content: '智慧试验田',
	padding: 12,
	display: 'ALWAYS',
	fontSize: 14,
	textAlign: 'center',
	borderRadius: RADIUS,
	borderWidth: 2,
	bgColor: '#ffffff'
};
const INIT_CALLOUT_MARKER = {
	callout: {
		...INIT_CALLOUT
	},
	latitude: 30.238871,
	longitude: 119.729963,
};

Page({

	/**
   * 页面的初始数据
   */
	data: {
		imgs: {
			rightArrow: `${CDN_PATH}/iconArrowRight@3x.png`
		},
		markerImgs: [{
			normal: './imgs/Marker1_Normal@3x.png',
			active: './imgs/Marker1_Activated@3x.png'
		},{
			normal: './imgs/Marker2_Normal@3x.png',
			active: './imgs/Marker2_Activated@3x.png'
		},{
			normal: './imgs/Marker3_Normal@3x.png',
			active: './imgs/Marker3_Activated@3x.png'
		}],
		calloutAligns: [
			{
				normal: `${CDN_PATH}/iconAlignLeft_Normal@3x.png`,
				active: `${CDN_PATH}/iconAlignLeft_Activated@3x.png`,
				value: 'left'
			},{
				normal: `${CDN_PATH}/iconAlignCenter_Normal@3x.png`,
				active: `${CDN_PATH}/iconAlignCenter_Activated@3x.png`,
				value: 'center'
			},{
				normal: `${CDN_PATH}/iconAlignRight_Normal@3x.png`,
				active: `${CDN_PATH}/iconAlignRight_Activated@3x.png`,
				value: 'right'
			}
		],
		calloutBorderWidths: [
			{
				normal: `${CDN_PATH}/iconLinewidthS_Normal@3x.png`,
				active: `${CDN_PATH}/iconLinewidthS_Activated@3x.png`,
				value: 1
			},{
				normal: `${CDN_PATH}/iconLinewidthM_Normal@3x.png`,
				active: `${CDN_PATH}/iconLinewidthM_Activated@3x.png`,
				value: 2
			},{
				normal: `${CDN_PATH}/iconLinewidthL_Normal@3x.png`,
				active: `${CDN_PATH}/iconLinewidthL_Activated@3x.png`,
				value: 3
			}
		],
		calloutPaddings: [
			{
				normal: `${CDN_PATH}/iconTextSpaceS_Normal@3x.png`,
				active: `${CDN_PATH}/iconTextSpaceS_Activated@3x.png`,
				value: 12
			},{
				normal: `${CDN_PATH}/iconTextSpaceM_Normal@3x.png`,
				active: `${CDN_PATH}/iconTextSpaceM_Activated@3x.png`,
				value: 16
			},{
				normal: `${CDN_PATH}/iconTextSpaceL_Normal@3x.png`,
				active: `${CDN_PATH}/iconTextSpaceL_Activated@3x.png`,
				value: 20
			}
		],
		markers: [{
			...INIT_MARKER
		}],
		calloutMarkers: [{
			...INIT_CALLOUT_MARKER
		}],
		tabIndex: 0,
		markerImgIndex: 0,
		calloutAlignIndex: 1,
		calloutBorderColorIndex: 3,
		calloutBorderWidthIndex: 1,
		calloutPaddingIndex: 0,
		showColorActionsheet: false,
		showBorderColorActionsheet: false,
		showBgColorActionsheet: false,
		showRadius: true,
		scale: 15,
		location: {
			latitude: 30.238871,
	        longitude: 119.729963
		},
		percent: 100
	},
});

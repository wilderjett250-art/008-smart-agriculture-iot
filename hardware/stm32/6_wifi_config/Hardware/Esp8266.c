#include "stm32f10x.h"                  // Device header
#include "Serial.h"
#include "OLED.h"
#include "Delay.h"
#include <String.h>

uint8_t Connect_Num;

void ESP8266_Init(void){
	OLED_Clear();
	OLED_ShowString(1, 1, "Waiting for");
	OLED_ShowString(2, 1, "WiFi connection");
	OLED_ShowString(3, 1, "3s");
	Delay_s(1);
	OLED_ShowString(3, 1, "2s");
	Delay_s(1);
	OLED_ShowString(3, 1, "1s");
	Delay_s(1);
	Serial_SendString("AT+MQTTUSERCFG=0,1,\"wanma\",\"\",\"\",0,0,\"\"\r\n");
	OLED_ShowString(3, 1, "  ");
	Delay_s(2);
	if (Serial_RxFlag == 1){
		if (strcmp(Serial_RxPacket, "OK") == 0){
			Serial_SendString("AT+MQTTCONN=0,\"8.130.69.72\",1883,0\r\n");
			OLED_ShowString(3, 1, "                ");
			OLED_ShowString(3, 1, "CONN_OK");
		}else{
			OLED_ShowString(3, 1, "                ");
			OLED_ShowString(3, 1, "CONN_Falied");
		}
		Serial_RxFlag = 0;
	}
	Delay_s(2);
	if (Serial_RxFlag == 1){
		if (strcmp(Serial_RxPacket, "OK") == 0){
			Serial_SendString("AT+MQTTSUB=0,\"test\\#\",1\r\n");
			OLED_ShowString(3, 1, "                ");
			OLED_ShowString(3, 1, "CONN_OK");
		}else{
			OLED_ShowString(3, 1, "                ");
			OLED_ShowString(3, 1, "CONN_Falied");
		}
		Serial_RxFlag = 0;
	}
}

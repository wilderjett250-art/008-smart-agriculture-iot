#include "stm32f10x.h"                  // Device header
#include "Delay.h"
#include "OLED.h"
#include "Serial.h"
#include "LED.h"
#include <String.h>
#include "Key.h"
#include "Timer.h"
#include "DHT11.h"
#include "stdlib.h"

u8 temp = 0,humi = 0,tempL=0 ,humiL=0, dht_turn=0, tempFlag, KeyNum, warnNum = 30;

#define clientId "202505172324"

int main(void){
	
	OLED_Init();
	LED_Init();
	Serial_Init();
	Key_Init();
	Timer_Init();
	DHT11_Init();
	//连接函数
	OLED_ShowString(1, 1, "Waiting for");
	OLED_ShowString(2, 1, "WiFi connection");
	
	uint8_t waitTime = 0;
	uint8_t wifiConnected = 0;
	
	while(!wifiConnected) {
		// 检查串口接收
		if(Serial_RxFlag) {
			if(strstr(Serial_RxPacket, "WIFI CONNECTED") != NULL || strstr(Serial_RxPacket, "WIFI GOT IP") != NULL) {
				wifiConnected = 1;
				OLED_ShowString(4, 1, Serial_RxPacket);
				Serial_RxFlag = 0;
				OLED_ShowString(3, 1, "           ");
				OLED_ShowString(3, 1, "WIFI OK     ");
				Delay_s(1);
				break;
			}
			OLED_ShowString(4, 1, Serial_RxPacket);
			Serial_RxFlag = 0; // 清除接收标志
		}
 
		// 检查20秒超时
		if(waitTime > 200) {
			// 超时处理：进入SmartConfig模式
			// 关闭TIM2中断
			NVIC_DisableIRQ(TIM2_IRQn);
			Serial_SendString("AT+CWSTARTSMART=3\r\n");
			OLED_ShowString(3, 1, "              ");
			OLED_ShowString(3, 1, "SmartConfig...");
			
			// 等待用户配网成功（无限等待）
			while(1) {
				if(Serial_RxFlag) {
					if(strstr(Serial_RxPacket, "WIFI CONNECTED") != NULL || strstr(Serial_RxPacket, "WIFI GOT IP") != NULL) {
						wifiConnected = 1;
						OLED_ShowString(4, 1, Serial_RxPacket);
						Serial_RxFlag = 0;
						OLED_ShowString(3, 1, "           ");
						OLED_ShowString(3, 1, "WIFI OK     ");
						// 重新开启TIM2中断
						NVIC_EnableIRQ(TIM2_IRQn);
						Delay_s(1);
						break;
					}
					OLED_ShowString(4, 1, Serial_RxPacket);
					Serial_RxFlag = 0;
				}
				Delay_ms(100); // 防止忙等待
			}
		}
		waitTime++;
		Delay_ms(100); // 短暂延时降低CPU占用
	}
	
//	OLED_ShowString(3, 1, "5s");
//	Delay_s(1);
//	OLED_ShowString(3, 1, "4s");
//	Delay_s(1);
//	OLED_ShowString(3, 1, "3s");
//	Delay_s(1);
//	OLED_ShowString(3, 1, "2s");
//	Delay_s(1);
//	OLED_ShowString(3, 1, "1s");
	Delay_s(1);
	OLED_ShowString(3, 1, "                ");
	Serial_SendString("AT+MQTTUSERCFG=0,1,\""clientId"\",\"\",\"\",0,0,\"\"\r\n");
	OLED_ShowString(3, 1, "  ");
	Delay_s(2);
	Serial_SendString("AT+MQTTCONN=0,\"121.40.16.156\",1883,0\r\n");
	OLED_ShowString(3, 1, "                ");
	OLED_ShowString(3, 1, "CONN_OK");
	Delay_s(2);
	Serial_SendString("AT+MQTTSUB=0,\"control/"clientId"\",1\r\n");
	OLED_ShowString(3, 1, "                ");
	OLED_ShowString(3, 1, "MQTTSUB_OK");
	//连接函数
	
	OLED_Clear();
	OLED_ShowString(3, 1, "threshold");
	OLED_ShowNum(3,11,warnNum,2);
	OLED_ShowString(3,14,"C");
	
	/*显示温度*/
	OLED_ShowString(1,3,"temp:");
	OLED_ShowString(1,10,".");
	OLED_ShowString(1,14,"C");
	/*显示湿度*/
	OLED_ShowString(2,3,"humi:");
	OLED_ShowString(2,14,"%");
	DHT11_Read_Data(&temp,&tempL ,&humi,&humiL);
	OLED_ShowNum(1,8,temp,2);
	OLED_ShowNum(2,8,humi,2);
	OLED_ShowNum(1,11,tempL,1);
	while(1){
		if (Serial_RxFlag) {
			
			// 检查是否为MQTT订阅消息
			if (strstr(Serial_RxPacket, "+MQTTSUBRECV:") == Serial_RxPacket) {
					// 查找大括号位置
					char *start = strchr(Serial_RxPacket, '{');
					char *end = strrchr(Serial_RxPacket, '}');
					
					if (start && end && end > start) {
							// 计算有效数据长度并添加终止符
							size_t len = end - start;
							char payload[32];  // 假设payload不超过31字符
							strncpy(payload, start+1, len-1);
							payload[len] = '\0';
							
						  //num:001-----------将{}中的字符串转为topic和value--------------
							char msg_key[20] = {0};
							int msg_value = 0;
							
							// 查找冒号位置
							const char* colon = strchr(payload, ':');
							if (!colon) {
									printf("格式错误：找不到冒号\n");
									return 1;
							}
							
							// 提取key（light）
							size_t key_len = colon - payload - 2;  // 减去两个引号和冒号
							strncpy(msg_key, payload + 1, key_len);    // 跳过开头的引号
							msg_key[key_len] = '\0';

							// 提取value（1）
							char num_str[10] = {0};
							const char* end = payload + strlen(payload); // 没有引号则到字符串末尾
							size_t num_len = end - colon - 1; // 计算数值长度（-冒号）
							strncpy(num_str, colon + 1, num_len);
							num_str[num_len] = '\0';
							
							msg_value = atoi(num_str);
							
							sprintf(payload, "T:%s V:%d", msg_key, msg_value);
							//num:001-----------将{}中的字符串转为topic和value------------------
							
							//升到阈值以上只触发一次报警！只有温度下降到阈值以下再上升，才会重新触发报警
							if (msg_value ==  0){
								LED1_OFF();
							}else if (msg_value ==  1){
								LED1_ON();
							}
						
							// 显示收到的json内容
							OLED_ShowString(4, 1, "                ");
							OLED_ShowString(4, 1, payload);
					}
					
			}
			else {
				// 打印收到的字符串
				OLED_ShowString(4, 1, "                ");
				OLED_ShowString(4, 1, Serial_RxPacket);
				//Serial_SendString(Serial_RxPacket);
			}
			// 在这里你可以添加对收到字符串的其他处理逻辑

			// 重置接收标志，准备接收下一个字符串
			Serial_RxFlag = 0;
		}
		KeyNum = Key_GetNum();
		if (KeyNum == 1){
			LED1_OFF();
		}
		if (KeyNum == 2){
			warnNum ++;
			if (warnNum >= 40){
				warnNum = 25;
			}
			OLED_ShowNum(3,11,warnNum,2);
		}
	}
}

void TIM2_IRQHandler(void){
	if (TIM_GetITStatus(TIM2, TIM_IT_Update) == SET){
//		Serial_SendString("AT+MQTTPUB=0,\"test\",\"payload\",1,0\r\n");
		
		dht_turn = (dht_turn + 1) % 2;
		DHT11_Read_Data(&temp,&tempL ,&humi,&humiL);
		OLED_ShowNum(1,8,temp,2);
		OLED_ShowNum(2,8,humi,2);
		OLED_ShowNum(1,11,tempL,1);
		if (dht_turn % 2 == 0){
			Serial_Printf("AT+MQTTPUB=0,\"data/"clientId"\",\"{\\\"temperature\\\":\\\"%d.%d\\\"}\",1,0\r\n", temp, tempL);
		}else{
			Serial_Printf("AT+MQTTPUB=0,\"data/"clientId"\",\"{\\\"humidity\\\":\\\"%d\\\"}\",1,0\r\n", humi);
		}
		TIM_ClearITPendingBit(TIM2, TIM_IT_Update);
	}
}

#include <WiFiManager.h>  // Include WiFiManager library
#include <PZEM004Tv30.h>
#include <HardwareSerial.h>

// Static IP configuration
IPAddress staticIP(192, 168, 1, 55);     // Desired static IP
IPAddress gateway(192, 168, 1, 1);      // Gateway (Router IP)
IPAddress subnet(255, 255, 255, 0);     // Subnet mask

// PZEM-004T setup
HardwareSerial mySerial(1);
PZEM004Tv30 pzem(&mySerial, 16, 17); // RX = GPIO16, TX = GPIO17
WiFiServer server(80); // HTTP server

// Energy Monitoring
unsigned long previousMillis = 0;
float totalEnergy = 0.0; // kWh

void setup() {
    Serial.begin(115200);
    mySerial.begin(9600, SERIAL_8N1, 16, 17);

    // WiFiManager initialization
    WiFiManager wifiManager;

    // Set static IP configuration
    WiFi.config(staticIP, gateway, subnet);

    // Start WiFiManager to connect or set up credentials
    if (!wifiManager.autoConnect("ESP32_Setup", "password")) {
        Serial.println("Failed to connect. Restarting...");
        delay(3000);
        ESP.restart();
    }

    Serial.println("Wi-Fi connected!");
    Serial.println("IP Address: " + WiFi.localIP().toString());

    // Start HTTP server
    server.begin();
}

void loop() {
    WiFiClient client = server.available();
    if (client) {
        String request = client.readStringUntil('\r');
        client.flush();

        Serial.println("Request: " + request);

        // Handle the /live-data endpoint
        if (request.indexOf("/live-data") != -1) {
            float voltage = pzem.voltage();
            float current = pzem.current();
            float power = pzem.power();
            float frequency = pzem.frequency();
            float powerFactor = 0.0;

            // Calculate Power Factor
            if (voltage > 0 && current > 0) {
                powerFactor = power / (voltage * current);
                powerFactor = constrain(powerFactor, 0.0, 1.0); // Ensure within valid range
            }

            // Calculate kWh
            unsigned long currentMillis = millis();
            if (previousMillis > 0) {
                float durationHours = (currentMillis - previousMillis) / 3600000.0;
                totalEnergy += (power / 1000.0) * durationHours; // Power in kWh
            }
            previousMillis = currentMillis;

            if (isnan(voltage)) voltage = 0.0;
            if (isnan(current)) current = 0.0;
            if (isnan(power)) power = 0.0;
            if (isnan(frequency)) frequency = 0.0;

            String json = "{";
            json += "\"voltage\":" + String(voltage, 2) + ",";
            json += "\"current\":" + String(current, 2) + ",";
            json += "\"power\":" + String(power, 2) + ",";
            json += "\"frequency\":" + String(frequency, 2) + ",";
            json += "\"power_factor\":" + String(powerFactor, 2) + ",";
            json += "\"kwh\":" + String(totalEnergy, 4) + "}";
            sendResponse(client, json, "application/json", 200);
            return;
        }

        // Handle invalid requests
        sendResponse(client, "Invalid Request", "text/plain", 404);
    }
    delay(100); // Prevent overwhelming PZEM
}

void sendResponse(WiFiClient& client, String message, String contentType, int statusCode) {
    client.println("HTTP/1.1 " + String(statusCode) + " OK");
    client.println("Content-Type: " + contentType);
    client.println("Access-Control-Allow-Origin: *");
    client.println("Connection: close");
    client.println();
    client.print(message);
    client.stop();
}

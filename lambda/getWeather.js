import https from 'https';

const getLatLon = (city) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return reject("API key is missing");

    const options = {
        hostname: 'api.openweathermap.org',
        path: `/geo/1.0/direct?q=${city}&appid=${apiKey}`,
        method: 'GET',
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const locations = JSON.parse(data);
                if (locations.length === 0) {
                    return reject("City not found");
                }
                const { lat, lon } = locations[0];
                resolve({ lat, lon });
            } catch (error) {
                reject(`Failed to parse response: ${error.message}`);
            }
        });
    });

    req.on('error', error => reject(`Request error: ${error.message}`));
    req.end();
});

const getWeather = (lat, lon, property) => new Promise((resolve, reject) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return reject("API key is missing");

    const options = {
        hostname: 'api.openweathermap.org',
        path: `/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
        method: 'GET',
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const weatherData = JSON.parse(data);
                if(property == "description"){
                    resolve(weatherData.weather.description);
                }
                else if(property == "feels_like"){
                    resolve(weatherData.main.feels_like);
                }
                else if(property == "humidity"){
                    resolve(weatherData.main.humidity);
                }
                else if(property == "wind"){
                    resolve(weatherData.wind.speed);
                }
                else{
                    resolve(weatherData.main.temp);
                }
            } catch (error) {
                reject(`Failed to parse response: ${error.message}`);
            }
        });
    });

    req.on('error', error => reject(`Request error: ${error.message}`));
    req.end();
});

export async function handler(event) {
    try {
        const slots = event.sessionState.intent.slots;
        const city = slots?.Location?.value?.originalValue;
        const property = slots?.WeatherProperty?.value?.originalValue;

        if (!city) {
            throw new Error("Missing required parameter: city");
        }

        // Get lat/lon from city name
        const { lat, lon } = await getLatLon(city);

        // Get weather property from getWeather
        const propertyValue = await getWeather(lat, lon, property);
        let content = "";

        if(property == "overall description"){
            content = `The current weather in ${city} is ${propertyValue}.`;
        }
        else if(property == "feels-like temperature"){
            content = `The current temperature in ${city} feels like ${propertyValue}°C.`;
        }
        else if(property == "humidity"){
            content = `The current humidity in ${city} is ${propertyValue}%.`;
        }
        else if(property == "wind speed"){
            content = `The current wind speed in ${city} is ${propertyValue}m/s.`;
        }
        else{
            content = `The current temperature in ${city} is ${propertyValue}°C.`;
        }

        
        return {
            sessionState: {
                sessionAttributes: event.sessionState.sessionAttributes || {},
                intent: {
                    name: event.sessionState.intent.name,
                    slots: event.sessionState.intent.slots,
                    state: "Fulfilled"
                },
                dialogAction: {
                    type: "ElicitIntent"
                }
            },
            messages: [
                {
                    contentType: "PlainText",
                    content: content
                }
            ]
        };
    } catch (error) {
        return {
            sessionState: {
                sessionAttributes: event.sessionState.sessionAttributes || {},
                intent: {
                    name: event.sessionState.intent.name,
                    slots: event.sessionState.intent.slots,
                    state: "Fulfilled"
                },
                dialogAction: {
                    type: "ElicitIntent"
                }
            },
            messages: [
                {
                    contentType: "PlainText",
                    content: `Error: ${error.message}`
                }
            ]
        };
    }
}

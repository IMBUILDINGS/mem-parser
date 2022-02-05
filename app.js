const fs = require('fs');
const { parse } = require('path');

let parsedFile = {
    deviceInfo: null,
    sensorInfo: null,
    timezone: null,
    statusInfo: [],
    sensorData: []
};

//Load complete file as Buffer
let memFile = fs.readFileSync('./memfiles/example.mem');

//Read chuncks of 32 bytes (1 page)
for(let page = 0x0000; page < 0xFFFF; page++){
    let pageData = memFile.slice(0x20 * page, 0x20 * (page + 1));
    //console.log(page, pageData.length, pageData);
    parsePage(page, pageData);
}

console.log(parsedFile);

//Used to decode BCD encoded timestamp
function unbcd(bcd) {
	return ((bcd >> 4) * 10) + bcd % 16;
}

//Parsing data pages
function parsePage(page, pageData){
    switch(pageData[0]){
        case 0x00: parseSensorInfo(pageData); break;
        case 0x01: parseSensorData(pageData); break;
        case 0x03: parseStatusInfo(pageData); break;
        case 0xFF: return;
    }

    //First page containing device info
    if(page == 0x0000) parseDeviceInfo(pageData);

    //Getting timezone information
    if(page == 2 && pageData[0] >= 0x41 && pageData[0] <= 0x7A){
        parsedFile.timezone = pageData.toString('utf8');
    }
}

//Parsing actual sensor data
function parseSensorData(pageData){
    if(pageData[1] != 0x17) return;

    let sensorData = {};

    sensorData.timestamp = new Date(Date.UTC(2000 + unbcd(pageData[0x02]), unbcd(pageData[0x03]), unbcd(pageData[0x04]), unbcd(pageData[0x05]), unbcd(pageData[0x06]), unbcd(pageData[0x07])));
    sensorData.counter_a = pageData.readUInt16LE(0x10);
    sensorData.counter_b = pageData.readUInt16LE(0x13);
    sensorData.status = pageData[0x12];
    sensorData.battery = pageData[0x16] / 0xFF * 3;

    parsedFile.sensorData.push(sensorData);
}

//Parsing additional status info pages
//Not yet implemented
function parseStatusInfo(pageData){
    //let statusInfo = {};
    //parsedFile.statusInfo.push(statusInfo);
}

//Parsing device information
function parseDeviceInfo(pageData){
    let deviceInfo = {};

    deviceInfo.node_id = pageData.toString('hex',0x05,0x0A);

    parsedFile.deviceInfo = deviceInfo;
}

//Parsing main sensor information
function parseSensorInfo(pageData){
    let sensorInfo = {};

    sensorInfo.nodeIndex = pageData[0x01];
    sensorInfo.types = []
    if(pageData[0x02] != 0xFF) sensorInfo.types.push(pageData[0x02]);
    if(pageData[0x03] != 0xFF) sensorInfo.types.push(pageData[0x03]);
    if(pageData[0x04] != 0xFF) sensorInfo.types.push(pageData[0x04]);
    if(pageData[0x05] != 0xFF) sensorInfo.types.push(pageData[0x05]);
    if(pageData[0x06] != 0xFF) sensorInfo.types.push(pageData[0x06]);
    sensorInfo.version = String(pageData[0x07] / 10);
    sensorInfo.name = pageData.toString('utf8', 0x08, 0x10);
    sensorInfo.position = pageData.toString('utf8', 0x10, 0x17);
    sensorInfo.location = pageData.toString('utf8', 0x18, 0x1F);

    parsedFile.sensorInfo = sensorInfo;
}
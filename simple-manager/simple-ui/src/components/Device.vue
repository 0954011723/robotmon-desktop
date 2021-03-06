<template>
  <div>
    <Screenshot
      v-model="screenshotShow"
      :bytes="screenshotBS"
      :deviceWidth="screenshotDeviceWidth"
      :deviceHeight="screenshotDeviceHeight"
      @refresh="screenshot"
    ></Screenshot>
    <v-divider></v-divider>
    <v-list-item three-line>
      <v-list-item-content>
        <v-list-item-subtitle>
          <v-icon class="mr-3">mdi-cellphone-link</v-icon>
          <span>{{serial}}</span>
          <v-btn
            outlined
            color="success"
            small
            class="ml-3"
            @click="$emit('runShell', serial)"
          >ADB Shell</v-btn>
          <v-btn outlined color="success" small class="ml-3" @click="$emit('log', serial)">Log</v-btn>
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="serviceAddress != ''">
          <v-icon class="mr-3">mdi-access-point-network</v-icon>
          <span>{{serviceAddress}}</span>
        </v-list-item-subtitle>
        <v-list-item-subtitle v-else>
          <v-icon class="mr-3">mdi-access-point-network-off</v-icon>
          <span>Can not connect via network</span>
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="forwardPortDevice != ''">
          <v-icon class="mr-3">mdi-share-outline</v-icon>
          <span>Forward:</span>
          <v-icon class="ml-1">mdi-cellphone-android</v-icon>
          {{forwardPortDevice}}
          <v-icon class="ml-1">mdi-laptop</v-icon>
          {{forwardPortPC}}
        </v-list-item-subtitle>
        <v-list-item-subtitle v-else>
          <v-icon class="mr-3">mdi-share-outline</v-icon>
          <v-btn outlined color="success" small class="mr-1" @click="forward">Forward</v-btn>(adb forward)
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="serviceLaunched">
          <v-icon class="mr-3">mdi-play-circle-outline</v-icon>
          <v-btn outlined color="error" small class="mr-1" @click="stopService">Stop</v-btn>
          <span>Service Launched pid1: {{servicePid1}}, pid2: {{servicePid2}}</span>
        </v-list-item-subtitle>
        <v-list-item-subtitle v-else>
          <v-icon class="mr-3">mdi-stop-circle-outline</v-icon>
          <v-btn outlined color="primary" small class="mr-1" @click="startService">Start</v-btn>
          <span>Service Stopped</span>
        </v-list-item-subtitle>

        <v-list-item-subtitle v-if="connected && serviceLaunched">
          <v-icon class="mr-3">mdi-lan-connect</v-icon>
          <v-btn outlined color="error" small class="mr-1" @click="disconnect">Disconnect</v-btn>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                v-on="on"
                outlined
                color="primary"
                small
                class="mr-1"
                @click="runScript(false)"
              >Run</v-btn>
            </template>
            <div>Run script with Interrupt mode. Origin running script will keep running.</div>
          </v-tooltip>
          <v-tooltip bottom>
            <template v-slot:activator="{ on }">
              <v-btn
                v-on="on"
                outlined
                color="primary"
                small
                class="mr-1"
                @click="runScript(true)"
              >RunOverride</v-btn>
            </template>
            <div>
              <div>Run script with Async and Override mode. Origin running script will be reset.</div>
              <div>You can stop running loop with simple script like: console.log('stop');</div>
            </div>
          </v-tooltip>
          <v-btn outlined color="primary" small class="mr-1" @click="screenshot()">Screen</v-btn>
        </v-list-item-subtitle>
        <v-list-item-subtitle v-else>
          <v-icon class="mr-3">mdi-lan-disconnect</v-icon>
          <v-btn outlined color="primary" small class="mr-1" @click="connect">Connect</v-btn>
          <span>Service not connected</span>
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import { mapState, mapMutations } from "vuex";
import {
  SHOW_LOADING,
  HIDE_LOADING,
  SHOW_ALERT,
  HIDE_ALERT,
  APPEND_ADB_LOGGER,
  APPEND_SERVICE_LOGGER
} from "../store/types";
import {
  Empty,
  AdbForwardParams,
  DeviceSerial,
  CreateGRPCProxy
} from "../apprpc/app_pb";
import AppService from "../plugins/AppService";
import ServiceClient from "../plugins/ServiceClient";
import Screenshot from "./Screenshot";

export default {
  components: {
    Screenshot
  },
  props: ["device"],
  data: () => ({
    serial: "",
    serviceAddress: "",
    servicePid1: "",
    servicePid2: "",
    serviceLaunched: false,
    forwardPortDevice: "",
    forwardPortPC: "",
    connected: false,
    proxyAddress: "",
    screenshotShow: false,
    screenshotBS: null,
    screenshotDeviceWidth: 0,
    screenshotDeviceHeight: 0
  }),
  computed: {
    ...mapState("ui", ["currentCode"])
  },
  methods: {
    ...mapMutations("ui", [
      SHOW_LOADING,
      HIDE_LOADING,
      SHOW_ALERT,
      HIDE_ALERT,
      APPEND_ADB_LOGGER,
      APPEND_SERVICE_LOGGER
    ]),
    initDevice: function() {
      this.serial = this.device.getSerial();
      this.servicePid1 = this.device.getServicepid1();
      this.servicePid2 = this.device.getServicepid2();
      const serviceForward = this.device.getServiceforward();
      this.serviceLaunched = this.device.getServicelaunched();
      const serviceIp = this.device.getServiceip();
      const servicePort = this.device.getServiceport();
      if (serviceIp !== "") {
        this.serviceAddress = `${serviceIp}:${servicePort}`;
      } else {
        this.serviceAddress = ``;
      }
      // parse forward
      if (serviceForward !== undefined) {
        const forwards = serviceForward.split(" ");
        if (forwards.length > 2) {
          this.forwardPortDevice = forwards[2];
          this.forwardPortPC = forwards[1];
        }
      }
      // is connected
      const client = ServiceClient.GetClient(this.serial);
      if (client !== undefined) {
        this.connected = true;
        this.proxyAddress = client.getHost();
      }
    },
    forward: async function() {
      try {
        this[APPEND_ADB_LOGGER](`adb forward --list`);
        this[SHOW_LOADING]({
          title: "Forwarding Device",
          message: `adb -s ${this.serial} forward tcp:8081 tcp:`
        });
        let message = await AppService.getInstence().adbForwardList(
          new Empty()
        );
        const forwardResult = message.getMessage();
        this[APPEND_ADB_LOGGER](forwardResult);
        const port = this.findNextPort(forwardResult);

        this[APPEND_ADB_LOGGER](
          `adb -s ${this.serial} forward --no-rebind tcp:${port} tcp:8081`
        );
        this[SHOW_LOADING]({
          title: "Forwarding Device",
          message: `adb -s ${this.serial} forward --no-rebind tcp:${port} tcp:8081`
        });

        const param = new AdbForwardParams();
        param.setSerial(this.serial);
        param.setDeviceport("8081");
        param.setPcport(`${port}`);

        message = await AppService.getInstence().adbForward(param);
        const result = message.getMessage();
        this[HIDE_LOADING]();
        this[SHOW_ALERT]({ title: "Add Forwaed Done", message: result });
        this.forwardPortDevice = "tcp:8081";
        this.forwardPortPC = `tcp:${port}`;
      } catch (e) {
        this[HIDE_LOADING]();
        this[SHOW_ALERT]({ title: "Add Forwaed Error", message: e.message });
      }
    },
    findNextPort: function(forwardResult) {
      const forwards = forwardResult.split("\n");
      const usedPorts = {};
      for (const forward of forwards) {
        if (forward === "" || forward.search("tcp:8081") === -1) {
          continue;
        }
        const values = forward.split(" ");
        if (values.length > 2) {
          const ports = values[1].split(":");
          if (ports.length === 2) {
            usedPorts[+ports[1]] = true;
          }
        }
      }
      for (let port = 8081; port < 8109; port++) {
        if (usedPorts[port] === undefined) {
          return port;
        }
      }
      return 8081;
    },
    printStartServiceCommand: async function() {
      try {
        const deviceSerial = new DeviceSerial();
        deviceSerial.setSerial(this.serial);
        const commandResult = await AppService.getInstence().getStartCommand(
          deviceSerial
        );
        const ldPath = commandResult.getLdpath();
        const classPath = commandResult.getClasspath();
        const appProcess = commandResult.getAppprocess();
        const baseCommand = commandResult.getBasecommand();
        const fullCommand = commandResult.getFullcommand();
        this[APPEND_ADB_LOGGER](`fullCommand: ${fullCommand}`);
        this[APPEND_ADB_LOGGER](`baseCommand: ${baseCommand}`);
        this[APPEND_ADB_LOGGER](`ldPath     : ${ldPath}`);
        this[APPEND_ADB_LOGGER](`classPath  : ${classPath}`);
        this[APPEND_ADB_LOGGER](`appProcess : ${appProcess}`);
        return fullCommand;
      } catch (e) {
        this[SHOW_ALERT]({
          title: "Get Start Command Error",
          message: e.message
        });
      }
      return "";
    },
    startService: async function() {
      this[SHOW_LOADING]({
        title: "Starting service...",
        message: "..."
      });
      const fullCommand = await this.printStartServiceCommand();
      this[SHOW_LOADING]({
        title: "Starting service...",
        message: fullCommand
      });
      try {
        const deviceSerial = new DeviceSerial();
        deviceSerial.setSerial(this.serial);
        const startResult = await AppService.getInstence().startService(
          deviceSerial
        );
        this[HIDE_LOADING]();
        this.servicePid1 = startResult.getPid1();
        this.servicePid2 = startResult.getPid2();
        if (this.servicePid2 !== "") {
          this.serviceLaunched = true;
          this[APPEND_ADB_LOGGER](
            `Start Service Success: ${this.servicePid1}, ${this.servicePid2}`
          );
        } else {
          this[APPEND_ADB_LOGGER](
            `Start Service Unknown Error, pids: ${this.servicePid1}, ${this.servicePid2}`
          );
        }
      } catch (e) {
        this[HIDE_LOADING]();
        this[SHOW_ALERT]({
          title: "Start Service Error",
          message: `${e.message}<br />If still has problem, please reboot device.`
        });
        this[APPEND_ADB_LOGGER](`Start Service Failed`);
      }
    },
    stopService: async function() {
      this[SHOW_LOADING]({
        title: "Stop service...",
        message: "..."
      });
      try {
        if (this.connected) {
          this.disconnect();
        }
        const deviceSerial = new DeviceSerial();
        deviceSerial.setSerial(this.serial);
        await AppService.getInstence().stopService(deviceSerial);
        this.servicePid1 = "";
        this.servicePid2 = "";
        this.serviceLaunched = false;
      } catch (e) {
        this[SHOW_ALERT]({
          title: "Stop Service Error",
          message: e.message
        });
      }
      this[HIDE_LOADING]();
    },
    disconnect: function() {
      ServiceClient.DeleteClient(this.serial);
      this[APPEND_ADB_LOGGER](`Disconnect to service ${this.serial}`);
      this.connected = false;
    },
    connect: async function() {
      if (!this.serviceLaunched) {
        this[SHOW_ALERT]({
          title: "Warning Service Not Started",
          message: "Please start service."
        });
        return;
      }
      if (this.serviceAddress !== "") {
        this.connectImpl(this.serviceAddress);
      } else if (this.forwardPortDevice !== "") {
        const taps = this.forwardPortPC.split(":");
        this.connectImpl(`127.0.0.1:${taps[1]}`);
      } else {
        this[SHOW_ALERT]({
          title: "No Address available",
          message:
            "Please check network or FORWARD it (Create connection via adb)."
        });
      }
    },
    connectImpl: async function(grpcAddress) {
      this[SHOW_LOADING]({ title: "Connect to Service", message: "..." });
      // create grcp <-> http proxy
      const taps = grpcAddress.split(":");
      const httpPort = `${10000 + +taps[1]}`;
      const httpBindAddress = `0.0.0.0:${httpPort}`;
      try {
        this[SHOW_LOADING]({
          title: "Connect to Service",
          message: `Creating grpc to http proxy: ${grpcAddress} <-> ${httpBindAddress}`
        });
        await this.createProxy(grpcAddress, httpBindAddress);
        this[APPEND_ADB_LOGGER](
          `Proxy created: ${grpcAddress} <-> ${httpBindAddress}`
        );
      } catch (e) {
        this[HIDE_LOADING]();
        this[SHOW_ALERT]({
          title: "Can not create grpc <-> http proxy",
          message: e.message
        });
        this[APPEND_ADB_LOGGER](
          `Proxy create failed: ${grpcAddress} <-> ${httpBindAddress}`
        );
        return;
      }

      // connect to proxy to grpc service
      const address = `http://127.0.0.1:${httpPort}`;
      try {
        const client = ServiceClient.NetClient(this.serial, address);
        client.setLogListener((serial, address, msg) => {
          this[APPEND_SERVICE_LOGGER](
            `[${serial}][${new Date().toTimeString().substr(0, 8)}] ${msg}`
          );
        });
        const size = await client.getScreenSize();
        this[APPEND_ADB_LOGGER](
          `Connect to ${this.serial}(${address} -> ${grpcAddress}) success. ScreenSize: ${size.width}, ${size.height}`
        );
        this.connected = true;
        this.proxyAddress = address;
      } catch (e) {
        this[SHOW_ALERT]({
          title: `Connect to service failed: ${address} -> ${grpcAddress}`,
          message: e.message
        });
        this[APPEND_ADB_LOGGER](
          `Connect to service failed: ${address} -> ${grpcAddress}`
        );
      }
      this[HIDE_LOADING]();
    },
    createProxy: function(grpcAddress, httpBindAddress) {
      const createProxyParams = new CreateGRPCProxy();
      createProxyParams.setGrpcaddress(grpcAddress);
      createProxyParams.setHttpaddress(httpBindAddress);
      return AppService.getInstence().createProxy(createProxyParams);
    },
    runScript: async function(async) {
      if (this.currentCode === "") {
        this[SHOW_ALERT]({
          title: "Empty Code",
          message: "Please write some code ^^"
        });
        return;
      }
      const client = ServiceClient.GetClient(this.serial);
      if (client === undefined) {
        this[SHOW_ALERT]({
          title: "Not connected",
          message: "Please connect to service"
        });
        return;
      }
      try {
        if (async) {
          const result = await client.runScriptAsync(this.currentCode);
          this[APPEND_ADB_LOGGER](`Run Script Success. Result: ${result}`);
        } else {
          const result = await client.runScriptSync(this.currentCode);
          this[APPEND_ADB_LOGGER](`Run Script Success. Result: ${result}`);
        }
      } catch (e) {
        this[APPEND_ADB_LOGGER](`Run Script Failed: ${e.message}`);
      }
    },
    screenshot: async function() {
      try {
        const client = ServiceClient.GetClient(this.serial);
        const result = await client.getScreenshot();
        this.screenshotBS = result.bytes;
        this.screenshotDeviceWidth = result.deviceWidth;
        this.screenshotDeviceHeight = result.deviceHeight;
        this.screenshotShow = true;
      } catch (e) {
        this[APPEND_ADB_LOGGER](`Screenshot Failed: ${e.message}`);
      }
    }
  },
  mounted: async function() {
    this.initDevice();
  }
};
</script>
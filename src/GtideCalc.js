/*
 *文件名 : GtideCalc.js
 *作者 : 刘哲
 *创建时间 : 2021/4/7
 *文件描述 : 重力模型计算组件
 */
import React, { Component, lazy } from 'react';
import axios from "axios";
import moment from 'moment';
import 'moment/locale/zh-cn';
import { Map, Marker } from 'react-amap';
import { Button, message, InputNumber, Tooltip, Drawer, Result, Modal, Table, Popconfirm, notification, DatePicker, TimePicker, Input, Select } from "antd";
import {
    SearchOutlined, DeleteOutlined, QuestionCircleOutlined, SwapOutlined,
    //  LineChartOutlined, 
    SaveOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/zh_CN';
import copy from 'copy-to-clipboard';

const DataVis = lazy(() => import('./DataVis'));

//模型计算接口地址
const url = "http://139.217.82.132:5000/";
/**
 * 
 * 地图配置参数
 * 
 * @param {Boolean} Scale 地图比例尺
 * @param {Object} ControlBar 地图旋转、缩放按钮
 * @param {Object} MapType 地图切换覆盖层按钮
*/
const mapPlugins = [
    'Scale',
    {
        name: 'ControlBar',
        options: {
            position: { top: "10px", left: "-60px" },
        },
    },
    {
        name: 'MapType',
        options: {
            defaultType: 1,
            showRoad: true
        },
    }
];
//计算接口选项
const calcApiOptions = [
    { label: "正常重力", value: "normg" },
    { label: "固体潮", value: "tide" },
    { label: "潮汐变化", value: "tideplot" }
];
//磁场模型选项
const modelOptions = [
    { label: "TIDE", value: "tide" },
];
//计算时间选项
const durationOptions = [
    { label: "1天", value: 1 },
    { label: "30天", value: 30 },
    { label: "90天", value: 90 },
    { label: "180天", value: 180 },
    { label: "360天", value: 360 },
];
//计算步长选项
const incrementOptions = [
    { label: "60s", value: 60 },
    { label: "600s", value: 600 },
    { label: "3600s", value: 3600 },
];
/**
 * 
 * 表格列配置
 * 
 * @param {String} title 列名
 * @param {String} dataIndex 数据key
 * @param {Boolean} ellipsis 是否可缩略显示
 * @param {Number} width 列宽
*/
const paramColumns = [
    {
        title: '参数名称',
        dataIndex: 'paramName',
        ellipsis: true,
    },
    {
        title: '参数值',
        dataIndex: 'paramValue',
        ellipsis: true,
        render: value => (value === "normg" && "正常重力") || (value === "tide" && "固体潮") || (value === "tideplot" && "潮汐变化") || value
    },
]
/**
 * 
 * 验证是否为空值
 * 
 * @param {*} param 被验证的值
 * @param {String} paramName 被验证值的名称
*/
const checkNullvalue = (param, paramName) => {
    let checks = true;
    if (param === undefined || param === "" || param === null) {
        message.error(` ${paramName} 的值不能为空，请填写后重新提交`, 2);
        checks = false;
    } else {
        checks = true;
    }
    return checks;
};
/**
 * 
 * 将对象转换为表格需要的数据格式
 * 
 * @param {Object} data 数据源对象
 * @param {Array} targetDataSource 转换完成的数据
*/
const objectToDataSource = (data, targetDataSource) => {
    for (let key in data) {
        targetDataSource.push({
            key,
            paramName: key,
            paramValue: data[key]
        });
    }
    return targetDataSource;
};
/**
 * 
 * 缓存计算结果的消息提示
 * 
 * @param {String} message 消息的标题
 * @param {String} description 消息的具体描述
 * @param {Number} duration 显示时长
 * @param {String} placement 显示出现的位置
*/
const openNotification = () => {
    notification.info({
        message: '计算结果已缓存',
        description: '点击 “查看计算记录按钮” 可查看计算记录。',
        duration: 2,
        placement: "topLeft"
    });
};
/**
 * 
 * 日历中不可选日期
 * 
 * @param {Object} current 要判断是否符合要求的时间
*/
const disabledDate = current => current < moment(new Date(2000, 0, 1)) || current > moment();
export default class Calculate extends Component {
    constructor(props) {
        super(props);
        this.state = {
            calcApi: "normg",
            longitude: 116.3154878488183,
            latitude: 39.947406053933,
            inputLng: 116.3154878488183,
            inputLat: 39.947406053933,
            lngDegree: 116,
            lngMinute: 18,
            lngSecond: 56,
            latDegree: 39,
            latMinute: 56,
            latSecond: 51,
            viewMode: false,
            altitude: 0,
            model: "",
            modelDesc: "",
            modelName: "",
            Year: new Date().getFullYear(),
            Month: new Date().getMonth() + 1,
            Day: new Date().getDate(),
            hour: 12,
            minute: 0,
            second: 0,
            utc: 8,
            duration: undefined,
            increment: undefined,
            drwaerVisible: false,
            calcResult: {},
            calcResultData: [],
            calcStatus: true,
            resMsg: "",
            modalVisible: false,
            calcStorage: sessionStorage.getItem("calcStorage_gt") ? JSON.parse(sessionStorage.getItem("calcStorage_gt")) : [],
            storageVisible: false,
            detailVisible: false,
            currentStgData: {},
            calcDataSource: [],
            calcStgParamData: [],
            calcStgResData: [],
            calcTime: "",
            showIcon: false,
            address: "",
            searchContent: '',
            calcCompletedTime: "",
            loading: false,
            visVisible: false
        };
        /**
          * 
          * 地图事件
          * 
          * @param {Function} created 地图创建
          * @param {Function} click 点击事件
        */
        this.mapEvents = {
            created: e => {
                let auto, geocoder;
                window.AMap.plugin('AMap.Autocomplete', () => {
                    auto = new window.AMap.Autocomplete({ input: 'tipinput' });
                })
                window.AMap.plugin(["AMap.Geocoder"], () => {
                    geocoder = new window.AMap.Geocoder({
                        radius: 1000,
                        extensions: "all"
                    });
                    this.getAddress();
                });
                window.AMap.plugin('AMap.PlaceSearch', () => {
                    window.AMap.event.addListener(auto, "select", e => {
                        const { name, location } = e.poi;
                        this.setState({ searchContent: name });
                        geocoder.getAddress(location, (status, result) => {
                            if (status === 'complete' && result.regeocode) {
                                this.setState({
                                    longitude: location.R,
                                    latitude: location.Q,
                                    inputLng: location.R,
                                    inputLat: location.Q,
                                    lngDegree: parseInt(location.R),
                                    lngMinute: parseInt(location.R % 1 * 60),
                                    lngSecond: location.R % 1 * 60 % 1 * 60,
                                    latDegree: parseInt(location.Q),
                                    latMinute: parseInt(location.Q % 1 * 60),
                                    latSecond: location.Q % 1 * 60 % 1 * 60,
                                    address: result.regeocode.formattedAddress
                                });
                            } else {
                                message.error("查询失败", 2);
                            }
                        })
                    })
                })
            },
            click: e => {
                this.setState({
                    longitude: e.lnglat.R,
                    latitude: e.lnglat.Q,
                    inputLng: e.lnglat.R,
                    inputLat: e.lnglat.Q,
                    lngDegree: parseInt(e.lnglat.R),
                    lngMinute: parseInt(e.lnglat.R % 1 * 60),
                    lngSecond: e.lnglat.R % 1 * 60 % 1 * 60,
                    latDegree: parseInt(e.lnglat.Q),
                    latMinute: parseInt(e.lnglat.Q % 1 * 60),
                    latSecond: e.lnglat.Q % 1 * 60 % 1 * 60,
                })
                window.AMap.plugin(["AMap.Geocoder"], () => {
                    let geocoder = new window.AMap.Geocoder({
                        radius: 1000, //以已知坐标为中心点，radius为半径，返回范围内兴趣点和道路信息
                        extensions: "all"//返回地址描述以及附近兴趣点和道路信息，默认"base"
                    });
                    geocoder.getAddress(e.lnglat, (status, result) =>
                        this.setState({ address: status === 'complete' && result.regeocode ? result.regeocode.formattedAddress : "无数据" })
                    );
                });

            }
        }
        /**
          * 
          * 计算结果表格列配置
          * 
          * @param {String} title 列名
          * @param {String} dataIndex 数据key
          * @param {Boolean} ellipsis 是否可缩略显示
          * @param {String} width 列宽
          * @param {String} align 对齐方式
          * @param {HTMLElement} render 渲染方式
        */
        this.calcStorageColumns = [
            {
                title: '序号',
                dataIndex: 'key',
                ellipsis: true,
                width: 50,
                align: "center"
            },
            {
                title: '计算接口',
                dataIndex: 'calcApi',
                ellipsis: true,
                align: "center",
                render: calcApi => (calcApi === "normg" && "正常重力") || (calcApi === "tide" && "固体潮") || (calcApi === "tideplot" && "潮汐变化")
            },
            {
                title: '主要参数',
                dataIndex: 'params',
                ellipsis: true,
                align: "center",
                render: param =>
                    <div style={{ display: "inline-block", textAlign: "left" }}>
                        {param.longitude &&
                            <>
                                <span style={{ margin: 0 }}>经度: {param.longitude} °</span>
                                <br />
                            </>
                        }
                        <span style={{ margin: 0 }}>纬度: {param.latitude} °</span>
                    </div>
            },
            {
                title: '计算时间',
                dataIndex: 'time',
                ellipsis: true,
                align: "center"
            },
            {
                title: '操作',
                dataIndex: 'action',
                width: 80,
                align: "center",
                render: index =>
                    <div style={{ display: "flex", justifyContent: "space-around" }}>
                        <Popconfirm
                            title="确定删除这条记录吗?"
                            onConfirm={this.handleDeleteStorage.bind(this, index)}
                            okText="确定"
                            cancelText="取消"
                        >
                            <DeleteOutlined className="icon-delete" style={{ fontSize: 18 }} title="删除" />
                        </Popconfirm>
                        <SearchOutlined className="icon-view" onClick={this.openStgDetailDrawer.bind(this, index)} style={{ fontSize: 18 }} title="查看详情" />
                    </div>
            },
        ];
    }
    /**
    * 
    * 地图搜索框功能
    * 
    * @param {String} value 输入的内容
    */
    placeSearch = value => {
        this.setState({ searchContent: value })
    }
    // 组件挂载时调用
    componentDidMount() {
        document.title="重力模型计算器";
        let { calcStorage } = this.state;
        this.setCalcDataSource(calcStorage);
        window.addEventListener('resize', this.handleResize);
        this.setState({ showIcon: window.innerWidth <= 768 });
    }
    /**
    * 
    * 改变窗口大小调用
    * 
    * @param {Object} e 改变窗口大小时返回的对象
    */
    handleResize = e => this.setState({ showIcon: e.target.innerWidth <= 768 });
    /**
      * 
      * 修改经度或纬度功能
      * 
      * @param {String} key 判断修改的是经度还是纬度
      * @param {Number} value 经度或纬度的值
    */
    handleChangeLngLat = (key, value) => this.setState({ [key]: value }, () => this.locateCenter());
    // 根据经纬度的值在地图上定位功能
    locateCenter = () => {
        let { inputLng, inputLat } = this.state;
        if (typeof (inputLng) === "number" && typeof (inputLat) === "number" && String(inputLng).length > 0 && String(inputLat).length > 0) {
            this.setState({
                longitude: inputLng,
                latitude: inputLat
            }, () => this.getAddress());
        }
    }
    // 根据经纬度的度分秒值在地图上定位功能
    locateCenterByDMS = () => {
        let { lngDegree, lngMinute, lngSecond, latDegree, latMinute, latSecond } = this.state;
        if (typeof (lngDegree) === "number" && typeof (lngMinute) === "number" && typeof (lngSecond) === "number" && typeof (latDegree) === "number" && typeof (latMinute) === "number" && typeof (latSecond) === "number"
            && String(lngDegree).length > 0 && String(lngMinute).length > 0 && String(lngSecond).length > 0 && String(latDegree).length > 0 && String(latMinute).length > 0 && String(latSecond).length > 0) {
            this.setState({
                longitude: lngDegree + lngMinute / 60 + lngSecond / 60 / 60,
                latitude: latDegree + latMinute / 60 + latSecond / 60 / 60
            }, () => this.getAddress());
        }
    }
    //获取经纬度的地址名称
    getAddress = () => {
        let { longitude, latitude } = this.state;
        let geocoder = new window.AMap.Geocoder({
            radius: 1000,
            extensions: "all"
        });
        geocoder.getAddress(longitude + "," + latitude, (status, result) =>
            this.setState({ address: status === 'complete' && result.regeocode ? result.regeocode.formattedAddress : "无数据" })
        );
    }
    //切换经度显示格式
    handleChangeViewMode = () => {
        let { viewMode } = this.state;
        if (viewMode) {
            let { longitude, latitude } = this.state;
            this.setState({
                viewMode: !viewMode,
                lngDegree: parseInt(longitude),
                lngMinute: parseInt(longitude % 1 * 60),
                lngSecond: parseInt(longitude % 1 * 60 % 1 * 60),
                latDegree: parseInt(latitude),
                latMinute: parseInt(latitude % 1 * 60),
                latSecond: parseInt(latitude % 1 * 60 % 1 * 60),
            });
        } else {
            let { lngDegree, lngMinute, lngSecond, latDegree, latMinute, latSecond } = this.state;
            this.setState({
                viewMode: !viewMode,
                inputLng: lngDegree + lngMinute / 60 + lngSecond / 60 / 60,
                inputLat: latDegree + latMinute / 60 + latSecond / 60 / 60
            })
        }
    }
    /**
     * 
     * 修改经度或纬度的度分秒值功能
     * 
     * @param {String} key 判断修改的是经度还是纬度的度或分或秒
     * @param {Number} value 修改的值
    */
    handleChangeDMS = (key, value) => this.setState({ [key]: value }, () => this.locateCenterByDMS());
    /**
      * 
      * 修改高程或时区功能
      * 
      * @param {String} key 判断修改的是高程还是时区
      * @param {Number} value 高程或时区的值
    */
    handleChangeParam = (key, value) => this.setState({ [key]: value });
    /**
      * 
      * 修改计算时间
      * 
      * @param {String} value 当前所选择的值
    */
    handleChangeDuration = value => {
        this.setState({ duration: value });
    }
    /**
      * 
      * 修改计算步长
      * 
      * @param {String} value 当前所选择的值
    */
    handleChangeIncrement = value => {
        this.setState({ increment: value });
    }
    /**
      * 
      * 修改磁场模型功能
      * 
      * @param {String} value 当前所选择的磁场模型
    */
    handleChangeModel = value => {
        this.setState({ model: value });
        this.setModelDescName(value);
    }
    /**
      * 
      * 设置磁场模型介绍的标题和内容功能，在组件挂载和修改磁场模型调用
      * 
      * @param {String} value 当前所选择的磁场模型
    */
    setModelDescName = value => {
        let modelDesc = "", modelName = "";
        switch (value) {
            case "tide":
                modelName = "TIDE";
                modelDesc = "理论重力固体潮（Earth Tide，简称TIDE）模型。固体潮是一种重要的地球物理现象,会影响到各种测量数据的精确度,因此在大地测量、精密工程测量等很多应用中都需进行固体潮改正。根据固体潮理论,采用非弹性地球潮汐理论模型,在指定的时间段和时间间隔（分别为1分钟，30分钟，1小时，6小时）计算全球各个整数纬度上的重力固体潮的理论值。并且在二维和三维尺度上对全球重力固体潮进行仿真。可以很直观地观察各种波在全球的分布规律,以及某个区域的重力固体潮所有波,某类潮波,或者某个潮波分量随时间的变化规律,同时为固体潮的研究提供了一个很好的平台。";
                break;
            default:
                break;
        }
        this.setState({ modelDesc, modelName });
    }
    //控制磁场模型介绍抽屉是否显示
    handleModeldesDrawerVisible = () => {
        let { drwaerVisible } = this.state;
        this.setState({ drwaerVisible: !drwaerVisible });
    }
    /**
      * 
      * 修改日期功能
      * 
      * @param {Object} moment 所选择日期对应的时间对象
    */
    handleChangeDate = moment => {
        this.setState({
            Year: moment._d.getFullYear(),
            Month: moment._d.getMonth() + 1,
            Day: moment._d.getDate()
        });
    }
    /**
      * 
      * 修改时间功能
      * 
      * @param {Object} moment 所选择时间对应的时间对象
    */
    handleChangeTime = moment => {
        this.setState({
            hour: moment._d.getHours(),
            minute: moment._d.getMinutes(),
            second: moment._d.getSeconds()
        })
    }
    //提交参数并计算功能，计算成功后，显示计算结果对话框
    handleCalculate = api => {
        let { inputLng, inputLat, altitude, Year, Month, Day, hour, minute, second, utc, duration, increment } = this.state;
        let params = {};
        switch (api) {
            case "normg":
                params = {
                    lat: inputLat,
                    height: altitude,
                    key: "cea2009"
                }
                break;
            case "tide":
                params = {
                    lon: inputLng,
                    lat: inputLat,
                    alti: altitude,
                    Year,
                    Month,
                    Day,
                    hour,
                    minute,
                    second,
                    utc,
                    key: "cea2009"
                }
                break;
            case "tideplot":
                params = {
                    lon: inputLng,
                    lat: inputLat,
                    alti: altitude,
                    Year,
                    Month,
                    Day,
                    hour,
                    minute,
                    second,
                    utc,
                    duration,
                    increment,
                    key: "cea2009"
                }
                break;
            default:
                break;
        }
        axios.get(url + api, { params })
            .then(response => {
                let { data } = response;
                let { calcStatus } = this.state;
                if (data.key) {
                    this.setState({
                        calcStatus: calcStatus && false,
                        resMsg: data.key,
                    });
                } else {
                    let calcResultData = [];
                    switch (api) {
                        case "normg":
                            objectToDataSource(data, calcResultData);
                            this.setState({
                                calcResult: data,
                                calcResultData,
                                calcStatus: calcStatus && true,
                            });
                            break;
                        case "tide":
                            objectToDataSource(data, calcResultData);
                            this.setState({
                                calcResult: data,
                                calcResultData,
                                calcStatus: calcStatus && true,
                            });
                            break
                        case "tideplot":
                            let gtidelist = data.gtidelist.replace(/\[|\]| /g, "").split(",");
                            let timestamp = data.timestamp.replace(/\[|\]| /g, "").split(",");
                            let calcResult = { gtidelist, timestamp, figure: data.figure };
                            this.setState({
                                calcResult,
                                calcStatus: calcStatus && true,
                            });
                            break
                        default:
                            break
                    }

                }
                this.setState({ loading: false, modalVisible: true }, () => {
                    this.handleSaveResult();
                });
            }).catch(() => {
                this.setState({ calcStatus: false, loading: false });
                message.error("接口调用失败", 2);
            });
    }
    handleSubmit = () => {
        let { calcApi, inputLng, inputLat, altitude, utc, duration, increment } = this.state;
        let submit = () => {
            this.setState({
                calcResult: {},
                loading: true
            }, () => {
                this.handleCalculate(calcApi);
            })
        }
        switch (calcApi) {
            case "normg":
                if (checkNullvalue(inputLat, "纬度") && checkNullvalue(altitude, "高程")) {
                    submit();
                }
                break;
            case "tide":
                if (checkNullvalue(inputLng, "经度") && checkNullvalue(inputLat, "纬度") && checkNullvalue(altitude, "高程") && checkNullvalue(utc, "时区")) {
                    submit();
                }
                break;
            case "tideplot":
                if (checkNullvalue(inputLng, "经度") && checkNullvalue(inputLat, "纬度") && checkNullvalue(altitude, "高程") && checkNullvalue(utc, "时区") && checkNullvalue(duration, "计算时间") && checkNullvalue(increment, "计算步长")) {
                    submit();
                }
                break;
            default:
                break;
        }
    }
    //显示计算结果对话框
    openResModal = () => this.setState({ modalVisible: true });
    //关闭计算结果对话框
    closeResModal = () => {
        this.setState({ modalVisible: false });
        if (this.state.calcStatus) { openNotification(); }
    }
    //缓存计算结果到sessionStorage中
    handleSaveResult = () => {
        const { calcApi, address, longitude, latitude, altitude, Year, Month, Day, hour, minute, second, utc, duration, increment, calcResult, calcStorage } = this.state;
        let calcParams = {};
        switch (calcApi) {
            case "normg":
                calcParams = {
                    address,
                    latitude,
                    height: altitude,
                }
                break;
            case "tide":
                calcParams = {
                    address,
                    longitude,
                    latitude,
                    altitude,
                    Year,
                    Month,
                    Day,
                    hour,
                    minute,
                    second,
                    utc,
                }
                break;
            case "tideplot":
                calcParams = {
                    address,
                    longitude,
                    latitude,
                    altitude,
                    Year,
                    Month,
                    Day,
                    hour,
                    minute,
                    second,
                    utc,
                    duration,
                    increment,
                }
                break;
            default:
                break;
        }
        const date = new Date();
        let calcTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() > 9 ? date.getHours() : "0" + date.getHours()}:${date.getMinutes() > 9 ? date.getMinutes() : "0" + date.getMinutes()}:${date.getSeconds() > 9 ? date.getSeconds() : "0" + date.getSeconds()}`;
        calcStorage.push({ calcParams, calcResult, calcTime, calcApi });
        sessionStorage.setItem("calcStorage_gt", JSON.stringify(calcStorage));
        this.setState({ calcStorage, calcCompletedTime: calcTime });
        this.setCalcDataSource(calcStorage);
    }
    /**
      * 
      * 生成计算记录表格所需的数据格式
      * 
      * @param {Array} calcStorage 要转换的数据
    */
    setCalcDataSource = calcStorage => {
        const calcDataSource = [];
        for (let i = 0, len = calcStorage.length; i < len; i++) {
            calcDataSource.push({
                key: i,
                params: { longitude: calcStorage[i].calcParams.longitude ? calcStorage[i].calcParams.longitude.toFixed(6) : undefined, latitude: calcStorage[i].calcParams.latitude.toFixed(6), address: calcStorage[i].calcParams.address },
                time: calcStorage[i].calcTime,
                calcApi: calcStorage[i].calcApi,
                action: i
            });
        }
        this.setState({ calcDataSource });
    }
    //控制计算记录抽屉是否显示
    handleStgDrawerVisible = () => {
        let { storageVisible } = this.state;
        this.setState({ storageVisible: !storageVisible });
    }
    /**
      * 
      * 删除计算记录
      * 
      * @param {Number} index 要删除计算记录的序号
    */
    handleDeleteStorage = index => {
        let { calcStorage } = this.state;
        calcStorage.splice(index, 1);
        this.setState({ calcStorage });
        sessionStorage.setItem("calcStorage_gt", JSON.stringify(calcStorage));
        this.setCalcDataSource(calcStorage);
    }
    /**
      * 
      * 查看计算记录详情
      * 
      * @param {Number} index 要查看计算记录的序号
    */
    openStgDetailDrawer = index => {
        let { calcStorage } = this.state, calcStgParamData = [], calcStgResData = [];
        objectToDataSource(calcStorage[index].calcParams, calcStgParamData);
        calcStgParamData.unshift({ key: "calcApi", paramName: "计算接口", paramValue: calcStorage[index].calcApi });
        objectToDataSource(calcStorage[index].calcResult, calcStgResData);
        this.setState({
            currentStgData: calcStorage[index],
            detailVisible: true,
            calcStgParamData,
            calcStgResData,
        });
    }
    //关闭计算记录详情抽屉
    closeStgDetailDrawer = () => this.setState({ detailVisible: false });
    // 清空计算记录
    clearStorage = () => {
        this.setState({ calcStorage: [] });
        sessionStorage.removeItem("calcStorage_gt");
        this.setCalcDataSource([]);
    }
    //复制计算结果功能
    handleResCopy = () => {
        let { calcResult, calcApi } = this.state;
        if (calcApi === "tideplot") {
            copy(JSON.stringify(calcResult));
        } else {
            let str = "参数名称  参数值\r\n";
            for (let key in calcResult) {
                str += key + " # " + calcResult[key] + "\r\n";
            }
            copy(str);
        }
        message.success("已复制到剪贴板", 2);
    }
    //显示可视化模态框
    handleVis = () => {
        this.setState({
            visVisible: true
        })
    }
    //复制计算记录功能
    handleStgCopy = () => {
        let { currentStgData } = this.state;
        let str = "";
        str += "******计算时间******\r\n" + currentStgData.calcTime + "\r\n\r\n******计算参数******\r\n参数名称  参数值\r\n";
        str += "计算接口 # " + ((currentStgData.calcApi === "normg" && "正常重力") || (currentStgData.calcApi === "tide" && "固体潮") || (currentStgData.calcApi === "tideplot" && "潮汐变化")) + "\r\n";
        for (let key in currentStgData.calcParams) {
            str += key + " # " + currentStgData.calcParams[key] + "\r\n";
        }
        if (currentStgData.calcApi === "tideplot") {
            str += "\r\n******计算结果******\r\n" + JSON.stringify(currentStgData.calcResult);
        } else {
            str += "\r\n******计算结果******\r\n参数名称  参数值\r\n";
            for (let key in currentStgData.calcResult) {
                str += key + " # " + currentStgData.calcResult[key] + "\r\n";
            }
        }
        copy(str);
        message.success("已复制到剪贴板", 2);
    }
    render() {
        const { calcApi, longitude, latitude, inputLng, inputLat, lngDegree, lngMinute, lngSecond, latDegree, latMinute, latSecond, viewMode,
            altitude, utc, modalVisible, calcStatus, resMsg, storageVisible,
            detailVisible, calcDataSource, calcStgParamData, calcStgResData, showIcon, address, searchContent, calcResult, calcResultData,
            calcCompletedTime, model, modelDesc, modelName, drwaerVisible, loading, visVisible, currentStgData
        } = this.state;
        return (
            <div className="content calculate-content">
                <div className="params-container">
                    <div className="param">
                        <span className="param-label param-label-required">计算接口：</span>
                        <Select options={calcApiOptions} value={calcApi} placeholder="请选择计算接口" onChange={value => { this.setState({ calcApi: value }) }} />
                    </div>
                    <div className="param">
                        <span className="param-label">搜索地址：</span>
                        <Input.Search value={searchContent} id="tipinput" onChange={e => this.placeSearch(e.target.value)} allowClear />
                    </div>
                    <div className="param" style={{ display: "flex" }}>
                        <span className="param-label">当前定位地址：</span>
                        <div style={{ width: "calc(100% - 100px)" }}>{address}</div>
                    </div>
                    {(calcApi === "tide" || calcApi === "tideplot") &&
                        <div className="param">
                            <span className="param-label param-label-required">经度：</span>
                            <Tooltip placement="top" title="经度范围-180~180">
                                {viewMode ?
                                    <InputNumber value={inputLng ? inputLng.toFixed(6) : inputLng} max={180} min={-180} placeholder="-180~180" onChange={this.handleChangeLngLat.bind(this, "inputLng")} formatter={value => `${value} °`} />
                                    :
                                    <div className="triple-input">
                                        <InputNumber value={lngDegree} precision={0} max={lngMinute === 0 && lngSecond === 0 ? 180 : 179} min={lngMinute === 0 && lngSecond === 0 ? -180 : -179} onChange={this.handleChangeDMS.bind(this, "lngDegree")} formatter={value => `${value} °`} />
                                        <InputNumber value={lngMinute} precision={0} max={59} min={0} onChange={this.handleChangeDMS.bind(this, "lngMinute")} formatter={value => `${value} ′`} />
                                        <InputNumber value={lngSecond} precision={0} max={59} min={0} onChange={this.handleChangeDMS.bind(this, "lngSecond")} formatter={value => `${value} ″`} />
                                    </div>
                                }
                            </Tooltip>
                            <SwapOutlined title="切换格式" className="icon-info" onClick={this.handleChangeViewMode} />
                        </div>
                    }
                    <div className="param">
                        <span className="param-label param-label-required">纬度：</span>
                        <Tooltip placement="top" title="纬度范围-90~90">
                            {viewMode ?
                                <InputNumber value={inputLat ? inputLat.toFixed(6) : inputLat} max={90} min={-90} placeholder="-90~90" onChange={this.handleChangeLngLat.bind(this, "inputLat")} formatter={value => `${value} °`} />
                                :
                                <div className="triple-input">
                                    <InputNumber value={latDegree} precision={0} max={latMinute === 0 && latSecond === 0 ? 90 : 89} min={latMinute === 0 && latSecond === 0 ? -90 : -89} onChange={this.handleChangeDMS.bind(this, "latDegree")} formatter={value => `${value} °`} />
                                    <InputNumber value={latMinute} precision={0} max={59} min={0} onChange={this.handleChangeDMS.bind(this, "latMinute")} formatter={value => `${value} ′`} />
                                    <InputNumber value={latSecond} precision={0} max={59} min={0} onChange={this.handleChangeDMS.bind(this, "latSecond")} formatter={value => `${value} ″`} />
                                </div>
                            }
                        </Tooltip>
                        <SwapOutlined title="切换格式" className="icon-info" onClick={this.handleChangeViewMode} />
                    </div>
                    <div className="param">
                        <span className="param-label param-label-required">高程：</span>
                        <Tooltip placement="top" title="高程范围-10~600">
                            <InputNumber value={altitude} max={600} min={-10} placeholder="-10~600" onChange={this.handleChangeParam.bind(this, "altitude")} />
                        </Tooltip>
                    </div>
                    {(calcApi === "tide" || calcApi === "tideplot") &&
                        <>
                            <div className="param">
                                <span className="param-label param-label-required">日期：</span>
                                <DatePicker defaultValue={moment()} locale={locale} placeholder="请选择日期" disabledDate={disabledDate} onChange={this.handleChangeDate} allowClear={false} />
                            </div>
                            <div className="param">
                                <span className="param-label param-label-required">时间：</span>
                                <TimePicker defaultValue={moment('12:00:00', 'HH:mm:ss')} locale={locale} placeholder="请选择时间" format={'HH:mm:ss'} onChange={this.handleChangeTime} allowClear={false} />
                            </div>
                            <div className="param">
                                <span className="param-label param-label-required">时区：</span>
                                <Tooltip placement="top" title="正数为东时区，负数为西时区">
                                    <InputNumber defaultValue={utc} max={12} min={-11} precision={0} placeholder="-11~12" onChange={this.handleChangeParam.bind(this, "utc")} />
                                </Tooltip>
                            </div>
                        </>
                    }
                    {calcApi === "tideplot" &&
                        <>
                            <div className="param">
                                <span className="param-label param-label-required">计算时间：</span>
                                <Select options={durationOptions} placeholder="请选择计算时间" onChange={this.handleChangeDuration} />
                            </div>
                            <div className="param">
                                <span className="param-label param-label-required">计算步长：</span>
                                <Select options={incrementOptions} placeholder="请选择计算步长" onChange={this.handleChangeIncrement} />
                            </div>
                        </>
                    }
                    <div style={{ textAlign: "center" }}>
                        <Button className="custom-btn calculate-btn" loading={loading} onClick={this.handleSubmit} type="primary">计算</Button>
                    </div>
                    <Modal title="模型计算结果" visible={modalVisible} onOk={this.openResModal} onCancel={this.closeResModal} footer={null} width={800} style={{ maxWidth: "100%" }}>
                        <Result
                            status={calcStatus ? "success" : "error"}
                            title={calcStatus ? "计算成功!" : "计算失败!"}
                            subTitle={calcStatus ?
                                <div>
                                    <p>{"地址:" + address}</p>
                                    <p>{"时间:" + calcCompletedTime}</p>
                                    <p>{"经度:" + (inputLng ? inputLng.toFixed(6) : inputLng) + " °"}</p>
                                    <p>{"纬度:" + (inputLat ? inputLat.toFixed(6) : inputLat) + " °"}</p>
                                </div>
                                : resMsg}
                        />
                        {calcStatus ?
                            <>
                                {(calcApi === "normg" || calcApi === "tide") &&
                                    <Table dataSource={calcResultData} columns={paramColumns} bordered pagination={false} />
                                }
                                {calcApi === "tideplot" &&
                                    <img src={`data:image/png;base64,${calcResult.figure}`} alt="计算结果" style={{ maxWidth: "100%" }} />
                                }
                                <div style={{ padding: "16px 0", textAlign: "center" }}>
                                    <Button className="custom-btn" type="primary" onClick={this.handleResCopy} style={{ height: 44, marginRight: calcApi === "tideplot" && 80 }}>复制计算结果</Button>
                                    {calcApi === "tideplot" && <Button className="custom-btn" type="primary" onClick={this.handleVis} style={{ height: 44 }}>可视化</Button>}
                                </div>
                            </>
                            : null}
                    </Modal>
                </div>
                <div className="map-container">
                    <Map plugins={mapPlugins} viewMode="3D" amapkey="3dabe81a1752997b9089ccb0b1bfcecb" center={[longitude, latitude]} zoom={3} events={this.mapEvents}>
                        <Marker position={[longitude, latitude]} offset={{ x: -8, y: -21 }}>
                            <div className="marker">
                                <div className="circle" />
                                <div className="tran" />
                            </div>
                        </Marker>
                    </Map>
                </div>
                <Button className="custom-btn storage-btn" onClick={this.handleStgDrawerVisible} type="primary">{showIcon ? <SaveOutlined style={{ fontSize: 18 }} /> : "查看计算记录"}</Button>
                {/* <Button className="custom-btn datavis-btn" onClick={() => this.props.history.push("/datavis")} type="primary">{showIcon ? <LineChartOutlined style={{ fontSize: 18 }} /> : "数据可视化"}</Button> */}
                <Button className="custom-btn model-btn" onClick={this.handleModeldesDrawerVisible} type="primary">{showIcon ? <InfoCircleOutlined style={{ fontSize: 18 }} /> : "模型介绍"}</Button>
                <Drawer className="calcdrawer" title="计算记录" placement="left" onClose={this.handleStgDrawerVisible} visible={storageVisible} footerStyle={{ textAlign: "right" }}
                    footer={
                        <Button onClick={() => Modal.confirm({
                            title: '确定要清空记录吗?',
                            icon: <QuestionCircleOutlined style={{ color: 'red' }} />,
                            content: "记录清空后将无法恢复。",
                            okText: "确定",
                            okButtonProps: { danger: true, type: "primary" },
                            cancelText: "取消",
                            onOk: this.clearStorage,
                        })}>
                            清空记录
                         </Button>
                    }>
                    <Table className="calc-storage-table" dataSource={calcDataSource} columns={this.calcStorageColumns} bordered />
                    <Drawer className="calcdrawer" title="计算详情" placement="left" visible={detailVisible} onClose={this.closeStgDetailDrawer} footer={null}>
                        <div style={{ textAlign: "right", marginBottom: 10 }}>计算时间：{currentStgData.calcTime}</div>
                        <div className="stg-details-table-container">
                            <Table className="stg-details-table" style={{ width: detailVisible && calcStgParamData[0].paramValue === "tideplot" ? 250 : "calc(50% - 8px)" }} title={() => "计算参数"} dataSource={calcStgParamData} columns={paramColumns} bordered pagination={false} />
                            <div className="stg-details-table" style={{ width: detailVisible && calcStgParamData[0].paramValue === "tideplot" ? "calc(100% - 266px)" : "calc(50% - 8px)" }}>
                                {detailVisible && (calcStgParamData[0].paramValue === "normg" || calcStgParamData[0].paramValue === "tide") &&
                                    <Table title={() => "计算结果"} dataSource={calcStgResData} columns={paramColumns} bordered pagination={false} />
                                }
                                {detailVisible && calcStgParamData[0].paramValue === "tideplot" &&
                                    <>
                                        <h4 style={{ textAlign: "center", fontWeight: "bold", color: "rgba(0, 0, 0, 0.65)", padding: 16, margin: 0 }}>计算结果</h4>
                                        <img src={`data:image/png;base64,${calcStgResData[2].paramValue}`} alt="计算结果" style={{ maxWidth: "100%" }} />
                                    </>
                                }
                                <div style={{ padding: "16px 0", textAlign: "center" }}>
                                    <Button className="custom-btn" type="primary" onClick={this.handleStgCopy} style={{ height: 44, marginRight: detailVisible && calcStgParamData[0].paramValue === "tideplot" && 80 }}>复制计算详情</Button>
                                    {detailVisible && calcStgParamData[0].paramValue === "tideplot" &&
                                        <Button className="custom-btn" type="primary" onClick={this.handleVis} style={{ height: 44 }}>可视化</Button>
                                    }
                                </div>
                            </div>

                        </div>
                    </Drawer>
                </Drawer>
                <Drawer className="modeldrawer"
                    title={
                        <>模型：
                             <Select options={modelOptions} placeholder="请选择模型" onChange={this.handleChangeModel} />
                        </>
                    }
                    placement="right"
                    onClose={this.handleModeldesDrawerVisible}
                    visible={drwaerVisible}
                    bodyStyle={{ textIndent: "2em" }}
                >
                    {model ?
                        <>
                            <p style={{ textIndent: 0, fontSize: 20 }}>{modelName + "模型介绍"}</p>
                            <p>{modelDesc}</p>
                        </>
                        :
                        "请选择模型"
                    }
                </Drawer>
                <Modal className="vis-modal" visible={visVisible} onCancel={() => { this.setState({ visVisible: false }) }} footer={null} destroyOnClose zIndex={10000}>
                    <DataVis data={currentStgData.calcResult || calcResult} dataType="tideplot" />
                </Modal>
            </div>
        )
    }
}
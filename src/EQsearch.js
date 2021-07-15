/*
 *文件名 : EQsearch.js
 *作者 : 刘哲
 *创建时间 : 2021/4/9
 *文件描述 : 震例查询组件
 */
import React, { Component, lazy } from 'react';
import axios from "axios";
import moment from 'moment';
import 'moment/locale/zh-cn';
import { Map, Marker } from 'react-amap';
import { Button, message, InputNumber, Tooltip, Drawer, Result, Modal, Table, Popconfirm, notification, DatePicker, Input, Select } from "antd";
import { SearchOutlined, DeleteOutlined, QuestionCircleOutlined, SwapOutlined, SaveOutlined } from '@ant-design/icons';
import locale from 'antd/es/date-picker/locale/zh_CN';
import copy from 'copy-to-clipboard';
const DataVis = lazy(() => import('./DataVis'));
//模型查询接口地址
const url = "http://139.217.82.132:5090/";
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
//查询范围选项
const calcModeOptions = [
    { label: "USGS地震目录", value: "usgs" },
    { label: "CENC地震目录", value: "cenc" },
    { label: "ISC-GEM地震目录", value: "iscgem" }
];
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
        render: value => (value === "usgs" && "USGS地震目录") || (value === "cenc" && "CENC地震目录") || (value === "iscgem" && "ISC-GEM地震目录") || value
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
 * 缓存查询结果的消息提示
 * 
 * @param {String} message 消息的标题
 * @param {String} description 消息的具体描述
 * @param {Number} duration 显示时长
 * @param {String} placement 显示出现的位置
*/
const openNotification = () => {
    notification.info({
        message: '查询结果已缓存',
        description: '点击 “查看查询记录按钮” 可查看查询记录。',
        duration: 2,
        placement: "topLeft"
    });
};
export default class Calculate extends Component {
    constructor(props) {
        super(props);
        this.state = {
            calcMode: "usgs",
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
            range: undefined,
            magmin: undefined,
            sort: undefined,
            time1: undefined,
            moment1: undefined,
            time2: undefined,
            moment2: undefined,
            viewMode: false,
            calcResult: [],
            calcResultData: [],
            calcResColumns: [],
            calcStatus: false,
            resMsg: "",
            modalVisible: false,
            calcStorage: sessionStorage.getItem("calcStorage_eqs") ? JSON.parse(sessionStorage.getItem("calcStorage_eqs")) : [],
            storageVisible: false,
            detailVisible: false,
            currentStgData: {},
            calcDataSource: [],
            calcStgParamData: [],
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
          * 查询结果表格列配置
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
                title: '查询范围',
                dataIndex: 'calcMode',
                ellipsis: true,
                align: "center",
                render: calcMode => (calcMode === "usgs" && "USGS地震目录") || (calcMode === "cenc" && "CENC地震目录") || (calcMode === "iscgem" && "ISC-GEM地震目录")
            },
            {
                title: '主要参数',
                dataIndex: 'params',
                ellipsis: true,
                align: "center",
                render: param =>
                    <div style={{ display: "inline-block", textAlign: "left" }}>
                        <span style={{ margin: 0 }}>经度: {param.longitude} °</span>
                        <br />
                        <span style={{ margin: 0 }}>纬度: {param.latitude} °</span>
                    </div>
            },
            {
                title: '查询时间',
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
        document.title="震例检索";
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
    //切换经纬度显示格式
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
          * 修改日期功能
          * 
          * @param {Object} moment 所选择日期对应的时间对象
          * @param {String} dateString 所选择日期字符串
        */
    handleChangeTime1 = (moment, dateString) => {
        this.setState({
            moment1: moment,
            time1: dateString
        });
    };
    handleChangeTime2 = (moment, dateString) => {
        this.setState({
            moment2: moment,
            time2: dateString
        });
    };
    //提交参数并查询功能，查询成功后，显示查询结果对话框
    handleCalculate = api => {
        let { calcMode, inputLng, inputLat, time1, time2, range, magmin, sort } = this.state;
        axios.get(url + api, {
            params: {
                lon: inputLng,
                lat: inputLat,
                time1,
                time2,
                range,
                magmin,
                sort,
                key: "cea2009"
            }
        }).then(response => {
            let { data } = response;
            if (data.error) {
                this.setState({
                    loading: false,
                    modalVisible: true,
                    calcStatus: false,
                    resMsg: data.error,
                });
            } else {
                let calcResultData = [], calcResColumns = [];
                if (calcMode === "iscgem") {
                    data.catalog = JSON.parse(data.catalog);
                    data.figure = JSON.parse(data.figure);
                    calcResultData = data.catalog.data.map((item, index) => {
                        let obj = {}
                        obj.index = data.catalog.index[index];
                        for (let i = 0, len = item.length; i < len; i++) {
                            obj[data.catalog.columns[i]] = item[i];
                        }
                        obj.figure = data.figure[index];
                        return obj
                    });
                    calcResColumns = data.catalog.columns.map(item => ({
                        title: item,
                        dataIndex: item,
                        align: "center"
                    }));
                    calcResColumns.unshift({
                        title: "index",
                        dataIndex: "index",
                        align: "center"
                    });
                    calcResColumns.push({
                        title: "figure",
                        dataIndex: "figure",
                        align: "center",
                        className: "img-cell",
                        render: text => text === "None" ? text : <img src={`data:image/png;base64,${text}`} alt="查询结果" />
                    });
                    this.setState({
                        calcResult: data,
                        calcResultData,
                        calcStatus: true,
                        calcResColumns,
                    });
                } else {
                    data = JSON.parse(data);
                    calcResultData = data.data.map((item, index) => {
                        let obj = {}
                        obj.index = data.index[index];
                        for (let i = 0, len = item.length; i < len; i++) {
                            obj[data.columns[i]] = item[i];
                        }
                        return obj
                    });
                    calcResColumns = data.columns.map(item => ({
                        title: item,
                        dataIndex: item,
                        align: "center"
                    }));
                    calcResColumns.unshift({
                        title: "index",
                        dataIndex: "index",
                        align: "center"
                    });
                    this.setState({
                        calcResult: data,
                        calcResultData,
                        calcStatus: true,
                        calcResColumns,
                    });
                }
                this.setState({
                    loading: false,
                    modalVisible: true
                }, () => {
                    this.handleSaveResult();
                });
            }
        }).catch(() => {
            this.setState({ calcStatus: false, loading: false });
            message.error("接口调用失败", 2);
        });
    }
    handleSubmit = () => {
        let { calcMode, inputLng, inputLat, range, magmin, time1, time2, sort } = this.state;
        if (checkNullvalue(inputLng, "经度") && checkNullvalue(inputLat, "纬度") && checkNullvalue(range, "范围") && checkNullvalue(magmin, "最小震级") && checkNullvalue(time1, "开始日期") && checkNullvalue(time2, "结束日期") && checkNullvalue(sort, "排序方法")) {
            this.setState({
                calcResult: [],
                loading: true
            }, () => {
                this.handleCalculate(calcMode);
            })
        }
    }
    //显示查询结果对话框
    openResModal = () => this.setState({ modalVisible: true });
    //关闭查询结果对话框
    closeResModal = () => {
        this.setState({ modalVisible: false });
        if (this.state.calcStatus) { openNotification(); }
    }
    //缓存查询结果到sessionStorage中
    handleSaveResult = () => {
        const { calcMode, address, longitude, latitude, range, magmin, time1, time2, sort, calcResult, calcStorage, calcResultData, calcResColumns } = this.state;
        let calcParams = { address, longitude, latitude, range, magmin, time1, time2, sort };
        const date = new Date();
        let calcTime = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours() > 9 ? date.getHours() : "0" + date.getHours()}:${date.getMinutes() > 9 ? date.getMinutes() : "0" + date.getMinutes()}:${date.getSeconds() > 9 ? date.getSeconds() : "0" + date.getSeconds()}`;
        calcStorage.push({ calcParams, calcResult, calcTime, calcResultData, calcResColumns, calcMode });
        sessionStorage.setItem("calcStorage_eqs", JSON.stringify(calcStorage));
        this.setState({ calcStorage, calcCompletedTime: calcTime });
        this.setCalcDataSource(calcStorage);
    }
    /**
      * 
      * 生成查询记录表格所需的数据格式
      * 
      * @param {Array} calcStorage 要转换的数据
    */
    setCalcDataSource = calcStorage => {
        const calcDataSource = [];
        for (let i = 0, len = calcStorage.length; i < len; i++) {
            calcDataSource.push({
                key: i,
                params: { longitude: calcStorage[i].calcParams.longitude.toFixed(6), latitude: calcStorage[i].calcParams.latitude.toFixed(6), address: calcStorage[i].calcParams.address },
                time: calcStorage[i].calcTime,
                calcMode: calcStorage[i].calcMode,
                action: i
            });
        }
        this.setState({ calcDataSource });
    }
    //控制查询记录抽屉是否显示
    handleStgDrawerVisible = () => {
        let { storageVisible } = this.state;
        this.setState({ storageVisible: !storageVisible });
    }
    /**
      * 
      * 删除查询记录
      * 
      * @param {Number} index 要删除查询记录的序号
    */
    handleDeleteStorage = index => {
        let { calcStorage } = this.state;
        calcStorage.splice(index, 1);
        this.setState({ calcStorage });
        sessionStorage.setItem("calcStorage_eqs", JSON.stringify(calcStorage));
        this.setCalcDataSource(calcStorage);
    }
    /**
      * 
      * 查看查询记录详情
      * 
      * @param {Number} index 要查看查询记录的序号
    */
    openStgDetailDrawer = index => {
        let { calcStorage } = this.state, calcStgParamData = [];
        objectToDataSource(calcStorage[index].calcParams, calcStgParamData);
        calcStgParamData.unshift({ key: "calcMode", paramName: "查询范围", paramValue: calcStorage[index].calcMode });
        for (let i = 0, len = calcStorage[index].calcResColumns.length; i < len; i++) {
            if (calcStorage[index].calcResColumns[i].dataIndex === "figure") {
                calcStorage[index].calcResColumns[i].render = text => text === "None" ? text : <img src={`data:image/png;base64,${text}`} alt="查询结果" />
            }
        }
        this.setState({
            currentStgData: calcStorage[index],
            detailVisible: true,
            calcStgParamData,
        });
    }
    //关闭查询记录详情抽屉
    closeStgDetailDrawer = () => this.setState({ detailVisible: false, currentStgData: {} });
    // 清空查询记录
    clearStorage = () => {
        this.setState({ calcStorage: [] });
        sessionStorage.removeItem("calcStorage_eqs");
        this.setCalcDataSource([]);
    }
    //复制查询结果功能
    handleResCopy = () => {
        let { calcResultData } = this.state;
        copy(JSON.stringify(calcResultData));
        message.success("已复制到剪贴板", 2);
    }
    //复制查询记录功能
    handleStgCopy = () => {
        let { currentStgData } = this.state;
        let str = "";
        str += "******查询时间******\r\n" + currentStgData.calcTime + "\r\n\r\n******查询参数******\r\n参数名称  参数值\r\n";
        for (let key in currentStgData.calcParams) {
            str += key + " # " + currentStgData.calcParams[key] + "\r\n";
        }
        str += "\r\n******查询结果******\r\n" + JSON.stringify(currentStgData.calcResultData);
        copy(str);
        message.success("已复制到剪贴板", 2);
    }
    //显示可视化模态框
    handleVis = () => {
        this.setState({
            visVisible: true
        })
    }
    render() {
        const { calcMode, longitude, latitude, inputLng, inputLat, lngDegree, lngMinute, lngSecond, latDegree, latMinute, latSecond, viewMode,
            sort, moment1, moment2, modalVisible, calcStatus, resMsg, storageVisible, detailVisible, calcDataSource,
            calcStgParamData, showIcon, calcResult, address, searchContent, calcResultData, calcResColumns, calcCompletedTime
            , loading, visVisible, currentStgData
        } = this.state;
        return (
            <div className="content calculate-content">
                <div className="params-container">
                    <div className="param">
                        <span className="param-label param-label-required">查询范围：</span>
                        <Select options={calcModeOptions} value={calcMode} placeholder="请选择查询范围" onChange={value => { this.setState({ calcMode: value }) }} />
                    </div>
                    <div className="param">
                        <span className="param-label">搜索地址：</span>
                        <Input.Search value={searchContent} id="tipinput" onChange={e => this.placeSearch(e.target.value)} allowClear />
                    </div>
                    <div className="param" style={{ display: "flex" }}>
                        <span className="param-label">当前定位地址：</span>
                        <div style={{ width: "calc(100% - 100px)" }}>{address}</div>
                    </div>
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
                        <span className="param-label param-label-required">范围：</span>
                        <InputNumber min={0} step={10} placeholder="请输入范围(km)" onChange={value => { this.setState({ range: value }) }} />
                    </div>
                    <div className="param">
                        <span className="param-label param-label-required">最小震级：</span>
                        <Tooltip placement="top" title="最小震级范围 0~9">
                            <InputNumber min={0} max={9} step={0.1} placeholder="请输入最小震级" onChange={value => { this.setState({ magmin: value }) }} />
                        </Tooltip>
                    </div>
                    <div className="param">
                        <span className="param-label param-label-required">开始日期：</span>
                        <DatePicker
                            locale={locale}
                            placeholder="请选择开始日期"
                            disabledDate={current => current > moment2 || current > moment()}
                            onChange={this.handleChangeTime1}
                            allowClear={true}
                        />
                    </div>
                    <div className="param">
                        <span className="param-label param-label-required">结束日期：</span>
                        <DatePicker
                            locale={locale}
                            placeholder="请选择结束日期"
                            disabledDate={current => current < moment1 || current > moment()}
                            onChange={this.handleChangeTime2}
                            allowClear={true}
                        />
                    </div>
                    <div className="param">
                        <span className="param-label param-label-required">排序方法：</span>
                        <Select
                            defaultValue={sort}
                            options={[{ label: "t", value: "t" }, { label: "m", value: "m" }]}
                            placeholder="排序方法"
                            onChange={value => { this.setState({ sort: value }) }}
                        />
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <Button className="custom-btn calculate-btn" loading={loading} onClick={this.handleSubmit} type="primary">查询</Button>
                    </div>
                    <Modal title="模型查询结果" visible={modalVisible} onOk={this.openResModal} onCancel={this.closeResModal} footer={null} width={800} style={{ maxWidth: "100%" }}>
                        <Result
                            status={calcStatus ? "success" : "error"}
                            title={calcStatus ? "查询成功!" : "查询失败!"}
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
                                <Table dataSource={calcResultData} columns={calcResColumns} rowKey={record => record.index} bordered pagination={false} scroll={{ x: 'max-content' }} />
                                {/* {calcMode === "iscgem" &&
                                    calcResult.figure.map((path, index) =>
                                        <img key={index} src={`data:image/png;base64,${path}`} alt="查询结果" style={{ maxWidth: "100%" }} />
                                    )
                                } */}
                                <div style={{ padding: "16px 0", textAlign: "center" }}>
                                    <Button className="custom-btn" type="primary" onClick={this.handleResCopy} style={{ height: 44 }}>复制查询结果</Button>
                                    {/* <Button className="custom-btn" type="primary" onClick={this.handleVis} style={{ height: 44 }}>可视化</Button> */}
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
                <Button className="custom-btn storage-btn" onClick={this.handleStgDrawerVisible} type="primary">{showIcon ? <SaveOutlined style={{ fontSize: 18 }} /> : "查看查询记录"}</Button>
                <Drawer className="calcdrawer" title="查询记录" placement="left" onClose={this.handleStgDrawerVisible} visible={storageVisible} footerStyle={{ textAlign: "right" }}
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
                    <Drawer className="calcdrawer" title="查询详情" placement="left" visible={detailVisible} onClose={this.closeStgDetailDrawer} footer={null}>
                        <div style={{ textAlign: "right", marginBottom: 10 }}>查询时间：{currentStgData.calcTime}</div>
                        <div className="stg-details-table-container">
                            <Table className="stg-details-table" style={{ width: 250 }} title={() => "查询参数"} dataSource={calcStgParamData} columns={paramColumns} bordered pagination={false} />
                            <div className="stg-details-table" style={{ width: "calc(100% - 266px)" }}>
                                <Table className="stg-details-table" rowKey={record => record.index} title={() => "查询结果"} dataSource={currentStgData.calcResultData} columns={currentStgData.calcResColumns} bordered pagination={false} scroll={{ x: 'max-content' }} />
                                <div style={{ padding: "16px 0", textAlign: "center" }}>
                                    <Button className="custom-btn" type="primary" onClick={this.handleStgCopy} style={{ height: 44 }}>复制查询详情</Button>
                                    {/* <Button className="custom-btn" type="primary" onClick={this.handleVis} style={{ height: 44 }}>可视化</Button> */}
                                </div>
                            </div>
                        </div>
                    </Drawer>
                </Drawer>
                <Modal className="vis-modal" visible={visVisible} onCancel={() => { this.setState({ visVisible: false }) }} footer={null} destroyOnClose zIndex={10000}>
                    <DataVis data={currentStgData.calcResult || calcResult} dataType={currentStgData.calcMode || calcMode} />
                </Modal>
            </div >
        )
    }
}
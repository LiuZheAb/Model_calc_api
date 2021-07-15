/*
 *文件名 : DataVis.js
 *作者 : 刘哲
 *创建时间 : 2020/11/12
 *文件描述 : 数据可视化组件
 */
import React, { Component } from 'react';
import {
    // Button, 
    message,
} from "antd";
import { Chart } from '@antv/g2';
import {
    FullscreenOutlined, FullscreenExitOutlined, CopyOutlined,
    // RollbackOutlined 
} from '@ant-design/icons';
import copy from 'copy-to-clipboard';
import Monaco from 'react-monaco-editor';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
// import dataSource from "./data.json";

function timestampToTime(timestamp) {
    let date = new Date(timestamp * 1000);//时间戳为10位需*1000，时间戳为13位的话不需乘1000
    let Y = date.getFullYear() + '-';
    let M = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
    let D = date.getDate() + ' ';
    let h = (date.getHours() || "00") + ':';
    let m = (date.getMinutes() || "00") + ':';
    let s = date.getSeconds() || "00";
    return Y + M + D + h + m + s;
}
//获取最大值
let getMax = arr => {
    var max = arr[0];
    for (var i = 0; i < arr.length; i++) {
        if (max < arr[i]) {
            max = arr[i];
        }
    }
    return max;
}
//获取最小值
let getMin = arr => {
    var min = arr[0];
    for (var i = 0; i < arr.length; i++) {
        if (min > arr[i]) {
            min = arr[i];
        }
    }
    return min;
}
export default class DataVis extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            isFullScreen: false,
            fullScreenVisible: true,
            showIcon: false
        };
    }
    // 组件挂载时调用
    componentDidMount() {
        // 监听全屏、取消全屏事件
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach((item, index) => {
            window.addEventListener(item, () => this.listenFullscreenChange());
        });
        switch (this.props.dataType) {
            case "tideplot":
                let { gtidelist, timestamp } = this.props.data;
                let data = [];
                for (let i = 0, len = gtidelist.length; i < len; i++) {
                    data.push({
                        gtidelist: Number(gtidelist[i]),
                        timestamp: timestampToTime(timestamp[i])
                    })
                }
                this.setState({ data });
                // 图表初始化
                const chart = new Chart({
                    container: 'container',
                    autoFit: true,
                    height: 500,
                    width: "100%",
                    padding: [70, 20, 70, 40]
                });
                // 图表绑定数据
                chart.data(data);
                chart.scale({
                    gtidelist: {
                        nice: true
                    }
                });
                chart.axis("timestamp", {
                    label: {
                        autoEllipsis: false,
                        formatter: text => text.split(" ")[0]
                    },
                });
                chart.tooltip({
                    showTitle: true,
                    showCrosshairs: true,
                    title: (title, datum) => datum.timestamp
                })
                chart.line().position('timestamp*gtidelist').shape('smooth');
                chart.render();
                break;
            case "difiplot":
                if (this.props.output === "fdi") {
                    let { declination, f_intensity, inclination } = this.props.data;
                    let data = [];
                    let yData = [...declination, ...inclination];
                    yData = yData.map(item => Number(item));
                    for (let i = 0, len = f_intensity.length; i < len; i++) {
                        data.push({
                            f_intensity: Number(f_intensity[i]),
                            declination: Number(declination[i]),
                            inclination: Number(inclination[i]),
                            index: i
                        })
                    }
                    this.setState({ data });
                    // 图表初始化
                    const chart = new Chart({
                        container: 'container',
                        autoFit: true,
                        height: 500,
                    });
                    // 图表绑定数据
                    chart.data(data);
                    chart.scale({
                        index: {
                            alias: '序号',
                        },
                        f_intensity: {
                            sync: true,
                            nice: true,
                        },
                        declination: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        inclination: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        }
                    });
                    chart.axis('f_intensity', {
                        title: null,
                    });
                    chart.axis('declination', {
                        title: null,
                        grid: null,
                    });
                    chart.axis('inclination', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.tooltip({
                        showTitle: true,
                        showCrosshairs: true,
                        shared: true,
                    })
                    chart.legend({
                        custom: true,
                        items: [
                            { name: 'f_intensity', value: 'f_intensity', marker: { symbol: 'square', style: { stroke: '#9AD681', fill: "#9AD681", lineWidth: 2 } } },
                            { name: 'declination', value: 'declination', marker: { symbol: 'square', style: { stroke: '#4FAAEB', fill: "#4FAAEB", lineWidth: 2 } } },
                            { name: 'inclination', value: 'inclination', marker: { symbol: 'square', style: { stroke: '#F6C022', fill: "#F6C022", lineWidth: 2 } } },
                        ],
                    });
                    chart.removeInteraction('legend-filter'); // 自定义图例，移除默认的分类图例筛选交互
                    chart.line().position('index*f_intensity').color("#9AD681").shape('smooth');
                    chart.line().position('index*declination').color("#4FAAEB").shape('smooth');
                    chart.line().position('index*inclination').color("#F6C022").shape('smooth');
                    chart.render();
                } else if (this.props.output === "xyz") {
                    let { x_intensity, y_intensity, z_intensity } = this.props.data;
                    let data = [];
                    let yData = [...x_intensity, ...y_intensity, ...z_intensity];
                    yData = yData.map(item => Number(item));
                    for (let i = 0, len = x_intensity.length; i < len; i++) {
                        data.push({
                            x_intensity: Number(x_intensity[i]),
                            y_intensity: Number(y_intensity[i]),
                            z_intensity: Number(z_intensity[i]),
                            index: i
                        })
                    }
                    this.setState({ data });
                    // 图表初始化
                    const chart = new Chart({
                        container: 'container',
                        autoFit: true,
                        height: 500,
                    });
                    // 图表绑定数据
                    chart.data(data);
                    chart.scale({
                        index: {
                            alias: '序号',
                        },
                        x_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        y_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        z_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        }
                    });

                    chart.axis('x_intensity', {
                        title: null,
                    });
                    chart.axis('y_intensity', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.axis('z_intensity', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.tooltip({
                        showTitle: true,
                        showCrosshairs: true,
                        shared: true,
                    })
                    chart.legend({
                        custom: true,
                        items: [
                            { name: 'x_intensity', value: 'x_intensity', marker: { symbol: 'square', style: { stroke: '#4FAAEB', fill: "#4FAAEB", lineWidth: 2 } } },
                            { name: 'y_intensity', value: 'y_intensity', marker: { symbol: 'square', style: { stroke: '#9AD681', fill: "#9AD681", lineWidth: 2 } } },
                            { name: 'z_intensity', value: 'z_intensity', marker: { symbol: 'square', style: { stroke: '#F6C022', fill: "#F6C022", lineWidth: 2 } } },
                        ],
                    });
                    chart.removeInteraction('legend-filter'); // 自定义图例，移除默认的分类图例筛选交互
                    chart.line().position('index*x_intensity').color("#4FAAEB").shape('smooth');
                    chart.line().position('index*y_intensity').color("#9AD681").shape('smooth');
                    chart.line().position('index*z_intensity').color("#F6C022").shape('smooth');
                    chart.render();
                }
                break;
            case "emmsect":
                if (this.props.output === "fdi") {
                    let { declination, f_intensity, inclination } = this.props.data;
                    let data = [];
                    let yData = [...declination, ...inclination];
                    yData = yData.map(item => Number(item));
                    for (let i = 0, len = declination.length; i < len; i++) {
                        data.push({
                            f_intensity: Number(f_intensity[i]),
                            declination: Number(declination[i]),
                            inclination: Number(inclination[i]),
                            index: i
                        })
                    }
                    this.setState({ data });
                    // 图表初始化
                    const chart = new Chart({
                        container: 'container',
                        autoFit: true,
                        height: 500,
                    });
                    // 图表绑定数据
                    chart.data(data);
                    chart.scale({
                        index: {
                            alias: '序号',
                        },
                        f_intensity: {
                            sync: true,
                            nice: true,
                        },
                        declination: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        inclination: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        }
                    });
                    chart.axis('f_intensity', {
                        title: null,
                    });
                    chart.axis('declination', {
                        grid: null,
                        title: null,
                    });
                    chart.axis('inclination', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.tooltip({
                        showTitle: true,
                        showCrosshairs: true,
                        shared: true,
                    })
                    chart.legend({
                        custom: true,
                        items: [
                            { name: 'f_intensity', value: 'f_intensity', marker: { symbol: 'square', style: { stroke: '#9AD681', fill: "#9AD681", lineWidth: 2 } } },
                            { name: 'declination', value: 'declination', marker: { symbol: 'square', style: { stroke: '#4FAAEB', fill: "#4FAAEB", lineWidth: 2 } } },
                            { name: 'inclination', value: 'inclination', marker: { symbol: 'square', style: { stroke: '#F6C022', fill: "#F6C022", lineWidth: 2 } } },
                        ],
                    });
                    chart.removeInteraction('legend-filter'); // 自定义图例，移除默认的分类图例筛选交互
                    chart.line().position('index*f_intensity').color("#9AD681").shape('smooth');
                    chart.line().position('index*declination').color("#4FAAEB").shape('smooth');
                    chart.line().position('index*inclination').color("#F6C022").shape('smooth');
                    chart.render();
                } else if (this.props.output === "xyz") {
                    let { x_intensity, y_intensity, z_intensity } = this.props.data;
                    let data = [];
                    let yData = [...x_intensity, ...y_intensity, ...z_intensity];
                    yData = yData.map(item => Number(item));
                    for (let i = 0, len = x_intensity.length; i < len; i++) {
                        data.push({
                            x_intensity: Number(x_intensity[i]),
                            y_intensity: Number(y_intensity[i]),
                            z_intensity: Number(z_intensity[i]),
                            index: i
                        })
                    }
                    this.setState({ data });
                    // 图表初始化
                    const chart = new Chart({
                        container: 'container',
                        autoFit: true,
                        height: 500,
                    });
                    // 图表绑定数据
                    chart.data(data);
                    chart.scale({
                        index: {
                            alias: '序号',
                        },
                        x_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        y_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        },
                        z_intensity: {
                            sync: true,
                            nice: true,
                            max: getMax(yData),
                            min: getMin(yData)
                        }
                    });

                    chart.axis('x_intensity', {
                        title: null,
                    });
                    chart.axis('y_intensity', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.axis('z_intensity', {
                        grid: null,
                        title: null,
                        label: null
                    });
                    chart.tooltip({
                        showTitle: true,
                        showCrosshairs: true,
                        shared: true,
                    })
                    chart.legend({
                        custom: true,
                        items: [
                            { name: 'x_intensity', value: 'x_intensity', marker: { symbol: 'square', style: { stroke: '#4FAAEB', fill: "#4FAAEB", lineWidth: 2 } } },
                            { name: 'y_intensity', value: 'y_intensity', marker: { symbol: 'square', style: { stroke: '#9AD681', fill: "#9AD681", lineWidth: 2 } } },
                            { name: 'z_intensity', value: 'z_intensity', marker: { symbol: 'square', style: { stroke: '#F6C022', fill: "#F6C022", lineWidth: 2 } } },
                        ],
                    });
                    chart.removeInteraction('legend-filter'); // 自定义图例，移除默认的分类图例筛选交互
                    chart.line().position('index*x_intensity').color("#4FAAEB").shape('smooth');
                    chart.line().position('index*y_intensity').color("#9AD681").shape('smooth');
                    chart.line().position('index*z_intensity').color("#F6C022").shape('smooth');
                    chart.render();
                }
                break;
            default:
                break;
        }

        //如果在移动端，则隐藏全屏按钮
        let system = {
            win: false,
            mac: false,
            x11: false
        };
        let p = navigator.platform;
        system.win = p.indexOf("Win") === 0;
        system.mac = p.indexOf("Mac") === 0;
        system.x11 = (p === "X11") || (p.indexOf("Linux") === 0);
        if (system.win || system.mac || system.x11) {
            //电脑端
            this.setState({ fullScreenVisible: true });
        } else {
            //移动端
            this.setState({ fullScreenVisible: false });
        }
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
    // 复制数据功能
    handleCopyData = () => {
        copy(JSON.stringify(this.state.data, undefined, "\t"));
        message.success("数据已复制", 2);
    }
    // 全屏显示功能
    requestFullScreen = () => {
        let dom = document.getElementById('chart-container');
        let rfs = dom.requestFullScreen || dom.webkitRequestFullScreen || dom.mozRequestFullScreen || dom.msRequestFullScreen;
        rfs.call(dom);
    }
    // 退出全屏显示功能
    exitFullscreen() {
        let dom = document;
        let cfs = dom.cancelFullScreen || dom.webkitCancelFullScreen || dom.mozCancelFullScreen || dom.exitFullScreen;
        cfs.call(dom);
    }
    // 监听全屏、取消全屏事件的回调函数
    listenFullscreenChange() {
        let isFullScreen = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
        this.setState({ isFullScreen: isFullScreen ? true : false });
    }
    render() {
        const { data, isFullScreen, fullScreenVisible,
            //  showIcon 
        } = this.state;
        let str = JSON.stringify(data, undefined, "\t");
        return (
            <div style={{ width: "100%" }}>
                <div className="content datavis-content">
                    <div className="data-container">
                        <div className="controller-area">
                            <CopyOutlined onClick={this.handleCopyData} />
                            {fullScreenVisible ?
                                isFullScreen ?
                                    <FullscreenExitOutlined onClick={this.exitFullscreen} />
                                    :
                                    <FullscreenOutlined onClick={this.requestFullScreen} />
                                : null
                            }
                        </div>
                        <Monaco value={str} options={{ theme: "vs", minimap: { enabled: false }, readOnly: true, language: "javascript" }} />
                    </div>
                    <div className="chart-container" id="chart-container">
                        <div id="container"></div>
                    </div>
                </div>
                {/* <Button className="custom-btn back-btn" onClick={() => this.props.history.push("/home")} type="primary">{showIcon ? <RollbackOutlined style={{ fontSize: 18 }} /> : "返回计算"}</Button> */}
            </div>
        )
    }
}

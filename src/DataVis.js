/*
 *文件名 : DataVis.js
 *作者 : 刘哲
 *创建时间 : 2020/11/12
 *文件描述 : 数据可视化组件
 */
import React, { Component } from 'react';
import { Button, Input, message } from "antd";
import { Chart } from '@antv/g2';
import { FullscreenOutlined, FullscreenExitOutlined, CopyOutlined } from '@ant-design/icons';
import copy from 'copy-to-clipboard';

export default class DataVis extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            isFullScreen: false
        };
    }
    // 组件挂载时调用
    componentDidMount() {
        // 监听全屏、取消全屏事件
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange'].forEach((item, index) => {
            window.addEventListener(item, () => this.listenFullscreenChange());
        });
        let _this = this;
        // 获取数据
        fetch('https://gw.alipayobjects.com/os/antvdemo/assets/data/blockchain.json')
            .then(res => res.json())
            .then(data => {
                _this.setState({ data });
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
                // 图表配置
                chart.scale({
                    nlp: {
                        min: 0,
                        max: 100
                    },
                    blockchain: {
                        min: 0,
                        max: 100
                    }
                });
                chart.axis('nlp', false);
                chart.axis('blockchain', {
                    title: {
                        offset: 0,
                        text: "搜索热度指数",
                        rotate: 0,
                        style: {
                            x: 0,
                            y: 50,
                            textAlign: "left",
                            fontSize: 14,
                            fontWeight: "bold"
                        }
                    },
                });
                chart.legend({
                    custom: true,
                    items: [
                        { name: 'blockchain', value: 'blockchain', marker: { symbol: 'line', style: { stroke: '#1890ff', lineWidth: 2 } } },
                        { name: 'nlp', value: 'nlp', marker: { symbol: 'line', style: { stroke: '#2fc25b', lineWidth: 2 } } },
                    ],
                });
                chart.line().position('date*blockchain').color('#1890ff').shape('smooth');;
                chart.line().position('date*nlp').color('#2fc25b').shape('smooth');;
                chart.annotation().dataMarker({
                    top: true,
                    position: ['2016-02-28', 9],
                    text: {
                        content: 'Blockchain 首超 NLP',
                        style: {
                            textAlign: 'left',
                        },
                    },
                    line: {
                        length: 30,
                    },
                });
                chart.annotation().dataMarker({
                    top: true,
                    position: ['2017-12-17', 100],
                    line: {
                        length: 30,
                    },
                    text: {
                        content: '2017-12-17, 受比特币影响，\n blockchain搜索热度达到顶峰\n峰值：100',
                        style: {
                            textAlign: 'right',
                        }
                    },
                });
                chart.annotation().text({
                    top: true,
                    content: '示例图表',
                    style: {
                        textAlign: 'center',
                        x: 300,
                        y: -400,
                        fontSize: 16,
                        fontWeight: "bold",
                        fill: "#000"
                    }
                });
                chart.removeInteraction('legend-filter'); // 自定义图例，移除默认的分类图例筛选交互
                // 图表渲染
                chart.render();
            });
    }
    // 复制数据功能
    handleCopyData = () => {
        copy(JSON.stringify(this.state.data, undefined, "\t"));
        message.success("数据已复制", 2);
    }
    // 全屏显示功能
    requestFullScreen = () => {
        let dom = document.getElementById('content');
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
        const { data, isFullScreen } = this.state;
        return (
            <div>
                <div className="content" id="content">
                    <div className="data-container">
                        <div className="controller-area">
                            <CopyOutlined onClick={this.handleCopyData} />
                            {isFullScreen ?
                                <FullscreenExitOutlined onClick={this.exitFullscreen} />
                                :
                                <FullscreenOutlined onClick={this.requestFullScreen} />
                            }
                        </div>
                        <Input.TextArea value={JSON.stringify(data, undefined, "\t")} readOnly />
                    </div>
                    <div className="chart-container">
                        <div id="container"></div>
                    </div>
                </div>
                <Button className="custom-btn back-btn" onClick={() => this.props.history.push("/home")} type="primary">返回计算</Button>
            </div>
        )
    }
}

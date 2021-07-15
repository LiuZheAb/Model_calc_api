/*
 *文件名 : Header.js
 *作者 : 刘哲
 *创建时间 : 2020/11/11
 *文件描述 : 页面头部组件
 */
import React, { Component } from 'react';
import { withRouter } from "react-router-dom"

class Header extends Component {
    render() {
        let title = ""
        switch (this.props.location.pathname) {
            case "/":
            case "/home":
                title = "地磁模型计算器";
                break;
            case "/gtide":
                title = "重力模型计算器";
                break;
            case "/eqsearch":
                title = "震例检索";
                break;
            case "/datavis":
                title = "可视化";
                break;
            default:
                break;
        }
        return (
            <div className="header">
                <div className="header-content">
                    <div className="title">{title}</div>
                </div>
            </div>
        )
    }
}
export default withRouter(Header);
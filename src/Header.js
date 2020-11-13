/*
 *文件名 : Header.js
 *作者 : 刘哲
 *创建时间 : 2020/11/11
 *文件描述 : 页面头部组件
 */
import React, { Component } from 'react';
import logo from "./assets/images/logo.png";

export default class Header extends Component {
    render() {
        return (
            <div className="header">
                <div className="header-content">
                    <img className="logo" src={logo} alt="北京白家疃地球科学国家野外科学观测研究站" draggable={false} />
                    <div className="title">重力和地磁模型计算系统</div>
                </div>
            </div>
        )
    }
}

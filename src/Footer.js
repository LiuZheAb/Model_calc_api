/*
 *文件名 : Footer.js
 *作者 : 刘哲
 *创建时间 : 2020/11/11
 *文件描述 : 页面底部组件
 */
import React, { Component } from 'react';

export default class Footer extends Component {
    render() {
        return (
            <div className="footer">
                <span>Copyright &copy;2020 All rights reserved</span>
                <span>中国科学院地质与地球物理研究所</span>
                <span>官方网站: <a href="http://www.igg.cas.cn" target="_blank" rel="noopener noreferrer">http://www.igg.cas.cn</a></span>
            </div>
        )
    }
}
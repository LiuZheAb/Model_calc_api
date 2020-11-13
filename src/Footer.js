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
                <span>北京白家疃地球科学国家野外科学观测研究站</span>
                <span>官方网站: <a href="http://www.neobji.ac.cn" target="_blank" rel="noopener noreferrer">http://www.neobji.ac.cn</a></span>
            </div>
        )
    }
}

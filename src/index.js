/*
 *文件名 : index.js
 *作者 : 刘哲
 *创建时间 : 2020/11/2
 *文件描述 : 主体框架文件
 */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter as Router, Route } from "react-router-dom";
import Header from './Header';
import Footer from './Footer';
import Calculate from './Calculate';
import DataVis from './DataVis';
import './index.less';

class App extends Component {
    render() {
      return (
        <div className="main">
          <Header />
          <Router>
            <Route exact path="/datavis" component={DataVis}></Route>
            <Route exact path={["/", "/home"]} component={Calculate}></Route>
          </Router>
          <Footer />
        </div >
      )
    }
  }

ReactDOM.render(<App />, document.getElementById('root'));

reportWebVitals();

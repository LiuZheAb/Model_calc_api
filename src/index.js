/*
 *文件名 : index.js
 *作者 : 刘哲
 *创建时间 : 2020/11/2
 *文件描述 : 主体框架文件
 */
import React, { Component, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import reportWebVitals from './reportWebVitals';
import { HashRouter as Router, Route } from "react-router-dom";
import Header from './Header';
import Footer from './Footer';
// import Calculate from './Calculate';
// import GtideCalc from './GtideCalc';
// import DataVis from './DataVis';
import './index.less';

const Calculate = lazy(() => import('./Calculate'));
const GtideCalc = lazy(() => import('./GtideCalc'));
const EQsearch = lazy(() => import('./EQsearch'));
const DataVis = lazy(() => import('./DataVis'));

class App extends Component {
  render() {
    return (
      <Router>
        <Header />
        <Suspense fallback={null}>
          <Route exact path="/datavis" component={DataVis}></Route>
          <Route exact path="/gtide" component={GtideCalc}></Route>
          <Route exact path="/eqsearch" component={EQsearch}></Route>
          <Route exact path={["/", "/home"]} component={Calculate}></Route>
        </Suspense>
        <Footer />
      </Router>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'));

reportWebVitals();
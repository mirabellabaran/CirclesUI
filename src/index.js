import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

// An interactive segment in the outer torus
class Segment extends React.Component {
  constructor(props) {
    super(props);
  }

  getState(state) {
    switch (state) {
      case 0:
        return 'segment-lit';
      case 1:
        return 'segment-unlit';
      default:
        return 'segment-broken';
    }
  }

  render() {
    const stateClass = this.getState(this.props.state);
    const transform = `translate(50,50) rotate(${this.props.rotation}) translate(-50,-50)`;

    return (
      <path id={this.props.id} d={this.props.data} className={stateClass}
        fillOpacity={0.7} transform={transform} />
    )  
  }
}

// The collection of all segments
class SegmentCollection extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {

    // generate the SVG path data for a standard segment
    function createStandardSegment({ outer, inner, largeArc }) {

      const outerArc = `M${outer.start.x} ${outer.start.y} A 50 50 0 ${largeArc? 1:0} 1 ${outer.end.x} ${outer.end.y}`;
      const endJoin1 = `L ${inner.end.x} ${inner.end.y}`;
      const innerArc = `A 45 45 0 ${largeArc? 1:0} 0 ${inner.start.x} ${inner.start.y}`;
      const endJoin2 = `L ${outer.start.x} ${outer.start.y}`;

      const dataString = `${outerArc} ${endJoin1} ${innerArc} ${endJoin2}`;
      //console.log(dataString);

      return dataString;
    }

    // compute the x, y coordinates for the given angle and radius
    function computeURQCoordinate(degrees, hypot) {
      const radians = degrees * Math.PI/180.0;
      const x = Math.cos(radians) * hypot;
      const y = Math.sin(radians) * hypot;

      return {x: x, y: y};
    }

    // get the arc sweep end coordinates for the standard segment
    function getSegmentSpec(nSegments, radius, separationAngle, outerOrigin, innerOrigin) {
      let segmentEndCoordinates;
      let largeArc = false;

      switch (nSegments) {
        case 1:
          segmentEndCoordinates = { outer: { x: 0, y: 50 }, inner: { x: 5, y: 50}};
          largeArc = true;
          break;
        case 2:
          segmentEndCoordinates = { outer: { x: 100, y: 50 }, inner: { x: 95, y: 50}};
          break;
        case 3: {
            const outer = computeURQCoordinate(180 - 120, radius);
            const inner = computeURQCoordinate(180 - 120, radius - 5);
            segmentEndCoordinates = {
              outer: { x: radius + outer.x, y: radius - outer.y },
              inner: { x: radius + inner.x, y: radius - inner.y }
            };
          }
          break;
        case 4:
          segmentEndCoordinates = { outer: { x: 50, y: 0 }, inner: { x: 50, y: 5}};
          break;
        default: {
            const outer = computeURQCoordinate(360 / nSegments, radius);
            const inner = computeURQCoordinate(360 / nSegments, radius - 5);
            segmentEndCoordinates = {
              outer: { x: radius - outer.x, y: radius - outer.y },
              inner: { x: radius - inner.x, y: radius - inner.y }
            };
          }
          break;
      }

      return ({
        outer: {
          start: outerOrigin, end: segmentEndCoordinates.outer
        },
        inner: {
          start: innerOrigin, end: segmentEndCoordinates.inner
        },
        largeArc: largeArc
      })
    }


    if (this.props.segments > 0) {
      // generate a segment for each rotation angle
      function createSegments(rotation, index) {
        const state = this.props.states[index];
        return <Segment id={index} key={index}
                data={standardSegment} rotation={rotation} state={state} />
      }

      const separationAngle = 5;
      const radius = 50;
      const outerSeparationAdjustment = computeURQCoordinate(separationAngle, radius);
      const innerSeparationAdjustment = computeURQCoordinate(separationAngle, radius - 5);
      const outerOrigin = {
        x: radius - outerSeparationAdjustment.x,
        y: radius - outerSeparationAdjustment.y
      };
      const innerOrigin = {
        x: radius - innerSeparationAdjustment.x,
        y: radius - innerSeparationAdjustment.y
      };

      // generate a Path that decribes a standard segment with the required sweep
      const standardSpec = getSegmentSpec(this.props.segments, radius, separationAngle, outerOrigin, innerOrigin);
      const standardSegment = createStandardSegment(standardSpec);

      // generate the required number of Segments (each instance has a unique rotation transform)
      const angle = 360 / this.props.segments;
      const angles = Array.from({ length: this.props.segments }, (_, i) => i * angle);
      const segmentsArray = angles.map(createSegments, this);

      return segmentsArray;
    }
    else {
      return null;
    }
  }
}

class CircleControl extends React.Component {
  constructor(props) {
    super(props);
    
    // numerical representation of segment state (lit, unlit, broken)
    // TODO better state representation
    this.state = {
      states: Array(10).fill(0),
    };

    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(e) {
    if (e.target.nodeName == 'path') {
      const index = parseInt(e.target.id ?? -1, 10);
      if (!isNaN(index)) {

        // report click event
        const reporter = document.getElementById(this.props.reporterId);
        reporter.append(`Clicked segment: ${index}\n`);
        reporter.scrollTop = reporter.scrollHeight;

        // update the segment states
        const updated = this.state.states.slice();
        updated[index] = updated[index] === 0? 1 : 0;
        this.setState({
          states: updated
        });
      }
    }
  }

  // create one of the three inner control segments
  createInnerSegment({ outer, inner, radii }, invertSweep) {

    const outerArc = `M${outer.start.x} ${outer.start.y} A ${radii.outer} ${radii.outer} 0 0 ${invertSweep? 0:1} ${outer.end.x} ${outer.end.y}`;
    const endJoin1 = `L ${inner.end.x} ${inner.end.y}`;
    const innerArc = `A ${radii.inner} ${radii.inner} 0 0 ${invertSweep? 1:0} ${inner.start.x} ${inner.start.y}`;
    const endJoin2 = `L ${outer.start.x} ${outer.start.y}`;

    const dataString = `${outerArc} ${endJoin1} ${innerArc} ${endJoin2}`;
    console.log(dataString);

    return dataString;
  }

  // generate the title, search and enter-circle control segments
  createControlSegments(contentRadius, outerRadius, innerRadius) {
    const titleData = this.createInnerSegment({
      outer: {
        start: { x: contentRadius - outerRadius, y: contentRadius },
        end: { x: contentRadius + outerRadius, y: contentRadius },
      },
      inner: {
        start: { x: contentRadius - innerRadius, y: contentRadius },
        end: { x: contentRadius + innerRadius, y: contentRadius },
      },
      radii: {
        outer: outerRadius,
        inner: innerRadius
      }
    }, false);

    const searchData = this.createInnerSegment({
      outer: {
        start: { x: contentRadius - outerRadius, y: contentRadius },
        end: { x: contentRadius, y: contentRadius + outerRadius },
      },
      inner: {
        start: { x: contentRadius - innerRadius, y: contentRadius },
        end: { x: contentRadius, y: contentRadius + innerRadius },
      },
      radii: {
        outer: outerRadius,
        inner: innerRadius
      }
    }, true);

    const enterCircleData = this.createInnerSegment({
      outer: {
        start: { x: contentRadius, y: contentRadius + outerRadius },
        end: { x: contentRadius + outerRadius, y: contentRadius },
      },
      inner: {
        start: { x: contentRadius, y: contentRadius + innerRadius },
        end: { x: contentRadius + innerRadius, y: contentRadius },
      },
      radii: {
        outer: outerRadius,
        inner: innerRadius
      }
    }, true);

    return { titleData: titleData, searchData: searchData, enterCircleData: enterCircleData }
  }

  render() {
    // create the torus (atop which a variable number of circle segments are placed)
    const diameter = 100;
    const torusOuterRadius = diameter / 2;
    const torusInnerRadius = diameter / 2.8;
    const innerOffset = torusOuterRadius - torusInnerRadius;
    const torusData = `M 0 ${torusOuterRadius}
      A ${torusOuterRadius} ${torusOuterRadius} 0 1 1 ${diameter} ${torusOuterRadius}
      A ${torusOuterRadius} ${torusOuterRadius} 0 1 1 0 ${torusOuterRadius}
      M ${innerOffset} ${torusOuterRadius}
      A ${torusInnerRadius} ${torusInnerRadius} 0 1 1 ${diameter - innerOffset} ${torusOuterRadius}
      A ${torusInnerRadius} ${torusInnerRadius} 0 1 1 ${innerOffset} ${torusOuterRadius}`;

    // create the inner control segments
    const outerRadius = 37;
    const innerRadius = 12;
    const contentRadius = diameter / 2;
    const innerGap = 1;
    const controlSegmentData = this.createControlSegments(contentRadius, outerRadius, innerRadius);

    const textPathRadius = (innerRadius + (outerRadius - innerRadius) / 2);
    const textPathData =`M${contentRadius - textPathRadius} ${contentRadius} A ${textPathRadius} ${textPathRadius} 0 0 1 ${contentRadius + textPathRadius} ${contentRadius}`;

    return (
      <div onClick={(e) => this.handleClick(e)}>
        <svg
          id="ContainerSVG"
          viewBox="0 0 100 100"
          width={this.props.width}
          height={this.props.height}
          xmlns="<http://www.w3.org/2000/svg>"
        >
          <link rel="stylesheet" href="index.css" type="text/css" />

          <path d={torusData} fill="rgb(145, 197, 230)" fillRule='evenodd'/>

          <g transform="translate(5,5) scale(0.9,0.9)">
            <g>
              <defs>
                <clipPath id="shave-bottom">
                  <rect x="0" y="0" width={diameter} height={(diameter / 2) - innerGap} />
                </clipPath>
                <clipPath id="shave-top-right">
                  <rect x="0" y={(diameter / 2) + innerGap} width={(diameter / 2) - innerGap} height={(diameter / 2) - innerGap} />
                </clipPath>
                <clipPath id="shave-top-left">
                  <rect x={(diameter / 2) + innerGap} y={(diameter / 2) + innerGap} width={(diameter / 2) - innerGap} height={(diameter / 2) - innerGap} />
                </clipPath>
              </defs>
              <path id="text_path" d={textPathData} fill="transparent" />
              <path d={controlSegmentData.titleData} id={'innerTitle'} className={'innerControl'}
                fillOpacity={0.2} clipPath="url(#shave-bottom)" />
              <path d={controlSegmentData.searchData} id={'innerSearch'} className={'innerControl'}
                fillOpacity={0.2} clipPath="url(#shave-top-right)" />
              <path d={controlSegmentData.enterCircleData} id={'enterCircle'} className={'innerControl'}
                fillOpacity={0.2} clipPath="url(#shave-top-left)" />
              <g transform="translate(60,60)">
                <svg id="enterCircle" width="16" height="16" viewBox="0 0 27 27">
                  <defs>
                    <path id="visit-arrow-b" d="M104,94 C109.522847,94 114,98.4771525 114,104 C114,109.522847 109.522847,114 104,114 C99.5226829,114 95.7326156,111.057534 94.4580795,107.000883 L96.5819088,107.000968 C97.7689243,109.932285 100.642992,112 104,112 C108.418278,112 112,108.418278 112,104 C112,99.581722 108.418278,96 104,96 C100.642611,96 97.7682725,98.0681835 96.5815051,101.000029 L94.4577648,101.000119 C95.7319917,96.9429507 99.5223144,94 104,94 Z M109,104 L100,109 L102,106 L90,105 C89.4477153,105 89,104.552285 89,104 C89,103.447715 89.4477153,103 90,103 L102,102 L100,99 L109,104 Z"/>
                    <filter id="visit-arrow-a" width="140%" height="150%" x="-16%" y="-20%" filterUnits="objectBoundingBox">
                      <feOffset dx="1" dy="1" in="SourceAlpha" result="shadowOffsetOuter1"/>
                      <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1.5"/>
                      <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.2 0"/>
                    </filter>
                  </defs>
                  <g fill="none" fillRule="evenodd" transform="rotate(-45 -51.433 169.347)">
                    <use fill="#000" filter="url(#visit-arrow-a)" href="#visit-arrow-b"/>
                    <use fill="#FFF" href="#visit-arrow-b"/>
                  </g>
                </svg>
              </g>
              <g transform="translate(25,60)">
                <svg id="magnifier" width="16" height="16" viewBox="0 0 26 25">
                  <defs>
                    <path id="magnifier-b" d="M42.6115162,107.491681 L46,110.222601 L43.1820039,113 L40.4095162,109.661681 L42.6115162,107.491681 Z M32.9752379,94 C36.8275554,94 39.9504758,97.0768423 39.9504758,100.87232 C39.9504758,102.204 39.5660362,103.447214 38.9005375,104.500108 L41.0615162,106.242681 L39.1415162,108.134681 L37.4736446,106.124739 C36.2591887,107.135415 34.6894248,107.744639 32.9752379,107.744639 C29.1229204,107.744639 26,104.667797 26,100.87232 C26,97.0768423 29.1229204,94 32.9752379,94 Z M32.9752379,95.9635199 C30.2235825,95.9635199 27.9929251,98.1612643 27.9929251,100.87232 C27.9929251,103.583375 30.2235825,105.781119 32.9752379,105.781119 C35.7268933,105.781119 37.9575507,103.583375 37.9575507,100.87232 C37.9575507,98.1612643 35.7268933,95.9635199 32.9752379,95.9635199 Z"/>
                    <filter id="magnifier-a" width="150%" height="152.6%" x="-20%" y="-21.1%" filterUnits="objectBoundingBox">
                      <feOffset dx="1" dy="1" in="SourceAlpha" result="shadowOffsetOuter1"/>
                      <feGaussianBlur in="shadowOffsetOuter1" result="shadowBlurOuter1" stdDeviation="1.5"/>
                      <feColorMatrix in="shadowBlurOuter1" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.2 0"/>
                    </filter>
                  </defs>
                  <g fill="none" fillRule="evenodd" transform="translate(-24 -92)">
                    <use fill="#000" filter="url(#magnifier-a)" href="#magnifier-b"/>
                    <use fill="#FFF" href="#magnifier-b"/>
                  </g>
                </svg>
              </g>
              <text x='40%' y='50%' dominantBaseline={'middle'} textAnchor={'middle'}>
                <textPath href="#text_path">Circle Name</textPath>
              </text>
            </g>
            <SegmentCollection segments={this.props.segments} states={this.state.states} />
          </g>
        </svg>
      </div>
    )
  }
}

// Used to interact with the prototype and report events
class Scene extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      nSegments: 4,
    };
  }

  handleChange(e) {
    if (e.target.nodeName == 'INPUT' && e.target.checkValidity()) {
      const updated = parseInt(e.nativeEvent.data ?? 0, 10);
      const reporter = document.getElementById('reportArea')
      reporter.append(`Changed segments to ${updated}\n`);
      reporter.scrollTop = reporter.scrollHeight;

      this.setState({
        nSegments: updated,
      });  
    }
  }

  render() {
    return (
      <>
      <div className='controls'>
        <label htmlFor="nseg">Number of segments (0-10):</label>
        <input type="number" id="nseg" name="nseg" min="0" max="10" value={this.state.nSegments}
          onChange={(e) => this.handleChange(e)} />
        <textarea id="reportArea" rows={4} cols={40} readOnly/>
      </div>
      <CircleControl segments={this.state.nSegments} width={400} height={400} reporterId={'reportArea'} />
      </>
    )
  }
}

// ========================================

ReactDOM.render(
  <Scene />,
  document.getElementById('root')
);

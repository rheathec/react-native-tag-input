// @flow

import React, { Component, PropTypes } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import _ from 'lodash';

const { width } = Dimensions.get('window');

type Props = {
  /**
   * A handler to be called when array of tags change
   */
    onChange: (items: Array<any> ) => void,
  /**
   * An array of tags
   */
    value: Array<any>,
  /**
   * A RegExp to test tags after enter, space, or a comma is pressed
   */
    regex?: Object,
  /**
   * Background color of tags
   */
    tagColor?: string,
  /**
   * Text color of tags
   */
    tagTextColor?: string,
  /**
   * Color of text input
   */
    inputColor?: string,
  /**
   * TextInput props Text.propTypes
   */
    inputProps?: Object,
  /**
   * path of the label in tags objects
   */
    labelKey?: string,
  /**
   *  maximum number of lines of this component
   */
    numberOfLines: number,
};

type State = {
  text: string,
  inputWidth: ?number,
  lines: number,
};

type NativeEvent = {
  target: number,
  key: string,
  eventCount: number,
  text: string,
};

type Event = {
  nativeEvent: NativeEvent,
};

const DEFAULT_SEPARATORS = [',', ' ', ';', '\n'];
const DEFAULT_TAG_REGEX = /(.+)/gi

class TagInput extends Component {
  static propTypes = {
    onChange: PropTypes.func.isRequired,
    value: PropTypes.array.isRequired,
    regex: PropTypes.object,
    tagColor: PropTypes.string,
    tagTextColor: PropTypes.string,
    inputColor: PropTypes.string,
    inputProps: PropTypes.object,
    labelKey: PropTypes.string,
    numberOfLines: PropTypes.number,
  };

  props: Props;
  state: State = {
    text: '',
    inputWidth: null,
    lines: 1,
  };

  wrapperWidth = width;

  // scroll to bottom
  contentHeight: 0;
  scrollViewHeight: 0;

  static defaultProps = {
    tagColor: '#dddddd',
    tagTextColor: '#777777',
    inputColor: '#777777',
    numberOfLines: 2,
  };

  measureWrapper = () => {
    if (!this.refs.wrapper)
      return;

    this.refs.wrapper.measure((ox, oy, w, /*h, px, py*/) => {
      this.wrapperWidth = w;
      this.setState({ inputWidth: this.wrapperWidth });
    });
  };

  calculateWidth = () => {
    setTimeout(() => {
      if (!this.refs['tag' + (this.props.value.length - 1)])
        return;

      this.refs['tag' + (this.props.value.length - 1)].measure((ox, oy, w, /*h, px, py*/) => {
        const endPosOfTag = w + ox;
        const margin = 3;
        const spaceLeft = this.wrapperWidth - endPosOfTag - margin - 10;

        const inputWidth = (spaceLeft < 100) ? this.wrapperWidth : spaceLeft - 10;

        if (spaceLeft < 100) {
          if (this.state.lines < this.props.numberOfLines) {
            const lines = this.state.lines + 1;

            this.setState({ inputWidth, lines });
          } else {
            this.setState({ inputWidth }, () => this.scrollToBottom());
          }
        } else {
          this.setState({ inputWidth });
        }
      });
    }, 0);
  };

  componentDidMount() {
    setTimeout(() => {
      this.calculateWidth();
    }, 100);
  }

  componentDidUpdate(prevProps: Props, /*prevState*/) {
    if (prevProps.value.length != this.props.value.length || !prevProps.value) {
      this.calculateWidth();
    }
  }

  onChange = (event: Event) => {
    if (!event || !event.nativeEvent)
      return;

    const text = event.nativeEvent.text;

    if (text === '') {
      this.setState({ text: text + '\xa0' });
      return this.pop();
    }

    this.setState({ text: text });
    const lastTyped = text.charAt(text.length - 1);

    const parseWhen = this.props.separators || DEFAULT_SEPARATORS;

    if (parseWhen.indexOf(lastTyped) > -1)
      this.parseTags();
  };

  onBlur = (event: Event) => {
    if (!event || !event.nativeEvent || !this.props.parseOnBlur)
      return;

    const text = event.nativeEvent.text;
    this.setState({ text: text });
    this.parseTags();
  };

  parseTags = () => {
    const { text } = this.state;
    const { value } = this.props;

    const regex = this.props.regex || DEFAULT_TAG_REGEX;
    const results = text.trim().match(regex);

    if (results && results.length > 0) {
      this.setState({ text: '\xa0' });
      this.props.onChange([...new Set([...value, ...results])]);
    }
  };

  onKeyPress = (event: Event) => {
    if (this.state.text === '' && event.nativeEvent && event.nativeEvent.key == 'Backspace') {
      this.pop();
    }
  };

  focus = () => {
    if (!this.props.hideInput && this.refs.tagInput)
      this.refs.tagInput.focus();
  };

  pop = () => {
    const tags = _.clone(this.props.value);
    tags.pop();
    this.props.onChange(tags);
    this.focus();
  };

  removeIndex = (index: number) => {
    const tags = _.clone(this.props.value);
    const removed = tags[index];
    tags.splice(index, 1);
    this.props.onChange(tags, removed);
    this.focus();
  };

  _getLabelValue = (tag) => {
    const { labelKey } = this.props;

    if (labelKey) {
      if (labelKey in tag) {
        return tag[labelKey];
      }
    }

    return tag;
  };

  _renderTag = (tag, index) => {
    const { tagColor, tagTextColor, renderTag} = this.props;

    const onPress = () => this.removeIndex(index);
    const value = this._getLabelValue(tag);

    if(renderTag){
      return renderTag({onPress, index, value});
    }

    return (
      <TouchableOpacity
        key={index}
        ref={'tag' + index}
        style={[styles.tag, { backgroundColor: tagColor }, this.props.tagContainerStyle]}
        onPress={onPress}>
        <Text style={[styles.tagText, { color: tagTextColor }, this.props.tagTextStyle]}>
          {value}
        </Text>
        {this.props.tagCloseIconStyle &&
        <View style={this.props.tagCloseIconStyle}>
          <Text style={this.props.tagCloseTextStyle}>x</Text>
        </View>
        }
      </TouchableOpacity>
    );
  };



  scrollToBottom = (animated: boolean = true) => {

    if(this.props.hideInput && this.props.horizontal){
         this.refs.scrollView.scrollTo({x: 0, animated});
         return;
       }

    if(this.props.horizontal){
      this.refs.scrollView.scrollTo({
        x: this.contentWidth - this.scrollViewWidth -( this.scrollViewWidth *0.5),
        animated});

    }else {
      if (this.contentHeight > this.scrollViewHeight) {
        this.refs.scrollView.scrollTo({
          y: this.contentHeight - this.scrollViewHeight,
          animated,
        });
      }
    }

  };

  render() {
    const { text, inputWidth, lines } = this.state;
    const { value, inputColor, lineHeight, textInputHeight, horizontal, hideInput, addTagButton, scrollViewStyle, textInputContainerStyle } = this.props;
    const lHeight = lineHeight ? lineHeight : 40;
    const tInputHeight = textInputHeight ? textInputHeight : 10;

    const defaultInputProps = {
      autoCapitalize: 'none',
      autoCorrect: false,
      placeholder: 'Start typing',
      returnKeyType: 'done',
      keyboardType: 'default',
      underlineColorAndroid: 'rgba(0,0,0,0)',
    }

    const inputProps = { ...defaultInputProps, ...this.props.inputProps };

    const wrapperHeight = horizontal ? lHeight : (lines - 1) * 40 + lHeight;

    const width = inputWidth ? inputWidth : 400;

    return (
      <TouchableWithoutFeedback
        onPress={() => !hideInput && this.refs.tagInput.focus()}
        onLayout={this.measureWrapper}
        style={[styles.container]}>
        <View
          style={[styles.wrapper,{height: wrapperHeight}]}
          ref="wrapper"
          onLayout={this.measureWrapper}>
          <ScrollView
            ref='scrollView'
            horizontal={horizontal}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            style={[styles.tagInputContainerScroll, scrollViewStyle]}
            onContentSizeChange={(w, h) => {this.contentWidth = w; this.contentHeight = h}}
            onLayout={ev => {this.scrollViewHeight = ev.nativeEvent.layout.height;
                              this.scrollViewWidth = ev.nativeEvent.layout.width; }
            }
          >
            <View style={styles.tagInputContainer}>
              {addTagButton && addTagButton}
              {value.map((tag, index) => this._renderTag(tag, index))}

              {!hideInput &&
              <View style={[styles.textInputContainer, { width: this.state.inputWidth }, textInputContainerStyle]}>
                <TextInput
                  ref="tagInput"
                  blurOnSubmit={false}
                  onKeyPress={this.onKeyPress}
                  value={text}
                  style={[styles.textInput, {
                  width: width,
                  minHeight: tInputHeight,
                  color: inputColor,
                }]}
                  onBlur={this.onBlur}
                  onChange={this.onChange}
                  onSubmitEditing={this.parseTags}
                  {...inputProps}
                />
              </View>
              }

            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    marginTop: 3,
    marginBottom: 2,
    alignItems: 'flex-start',
  },
  tagInputContainerScroll: {
    flex: 1,
  },
  tagInputContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  textInput: {
    height: 36,
    fontSize: 16,
    flex: .4,
    justifyContent: 'center',
    marginTop: 6,
    marginRight: 3,
    padding: 8,
    height: 24,
    borderRadius: 2,

  },
  textInputContainer: {
    height: 36,
  },
  tag: {
    justifyContent: 'center',
    marginTop: 6,
    marginRight: 3,
    padding: 8,
    height: 24,
    borderRadius: 2,
  },
  tagText: {
    padding: 0,
    margin: 0,
  },
});

export default TagInput;

export { DEFAULT_SEPARATORS, DEFAULT_TAG_REGEX }

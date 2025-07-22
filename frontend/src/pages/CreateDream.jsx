import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Hash, Lock, Sparkles, Moon, Sun, Cloud, Clock, Bed, Star, Wand2, FileText, NotebookPen, BookOpen, Users, Globe, Heart, Brain, Palette, Text, X } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
// 确保Quill全局可用
import Quill from 'quill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import notification from '@/utils/notification';
import api from '@/services/api';
import { uploadImage } from '@/services/oss';
import { cn } from '@/lib/utils';
import './css/CreateDream.css';

// 梦境分类选项
const DREAM_CATEGORIES = [
  { value: 'normal', label: '普通梦境', color: '#6366f1' },
  { value: 'lucid', label: '清醒梦', color: '#8b5cf6' },
  { value: 'nightmare', label: '噩梦', color: '#ef4444' },
  { value: 'recurring', label: '重复梦', color: '#f59e0b' },
  { value: 'prophetic', label: '预知梦', color: '#10b981' },
  { value: 'healing', label: '治愈梦', color: '#06b6d4' },
  { value: 'spiritual', label: '灵性梦境', color: '#ec4899' },
  { value: 'creative', label: '创意梦境', color: '#f97316' },
  { value: 'hypnagogic', label: '入睡幻觉', color: '#84cc16' },
  { value: 'hypnopompic', label: '醒前幻觉', color: '#22d3ee' },
  { value: 'sleep_paralysis', label: '睡眠瘫痪', color: '#a855f7' },
  { value: 'false_awakening', label: '假醒', color: '#fb7185' },
  { value: 'anxiety', label: '焦虑梦', color: '#f87171' },
  { value: 'joyful', label: '快乐梦境', color: '#34d399' },
  { value: 'melancholic', label: '忧郁梦境', color: '#64748b' },
  { value: 'adventure', label: '冒险梦境', color: '#fbbf24' },
];

// 情绪选项
const MOOD_OPTIONS = [
  { value: 'very_negative', label: '非常消极', icon: '😢' },
  { value: 'negative', label: '消极', icon: '😔' },
  { value: 'neutral', label: '中性', icon: '😐' },
  { value: 'positive', label: '积极', icon: '😊' },
  { value: 'very_positive', label: '非常积极', icon: '😄' },
];

// 睡眠质量选项
const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: '很差' },
  { value: 2, label: '较差' },
  { value: 3, label: '一般' },
  { value: 4, label: '良好' },
  { value: 5, label: '很好' },
];

// 隐私选项
const PRIVACY_OPTIONS = [
  { value: 'private', label: '私人', icon: Lock },
  { value: 'public', label: '公开', icon: Sun },
  { value: 'friends', label: '好友可见', icon: Cloud },
];

// 标签类型选项
const TAG_TYPES = [
  { value: 'emotion', label: '情感' },
  { value: 'character', label: '角色' },
  { value: 'location', label: '地点' },
  { value: 'object', label: '物体' },
  { value: 'action', label: '行为' },
  { value: 'symbol', label: '符号' },
  { value: 'color', label: '颜色' },
  { value: 'sound', label: '声音' },
  { value: 'weather', label: '天气' },
  { value: 'time', label: '时间' },
  { value: 'custom', label: '自定义' },
];

// Enhanced WebGL Background Component
const WavyBackground = ({ children, className }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2', { alpha: true });
    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const vertexShaderSource = `#version 300 es
        precision mediump float;
        in vec2 aPosition;
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }`;

    const fragmentShaderSource = `#version 300 es
        precision highp float;
        out vec4 outColor;
        uniform vec2 uResolution;
        uniform float uTime;

        vec3 permute(vec3 x) {
            return mod(((x * 34.0) + 1.0) * x, 289.0);
        }

        float noise2D(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i = floor(v + dot(v, C.yy));
            vec2 x0 = v - i + dot(i, C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
            vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
            m = m * m;
            m = m * m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.792843 - 0.853734 * (a0 * a0 + h * h);
            vec3 g;
            g.x = a0.x * x0.x + h.x * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        float fbm(vec2 st) {
            float value = 0.0;
            float amplitude = 0.5;
            float freq = 1.0;
            for (int i = 0; i < 6; i++) {
                value += amplitude * noise2D(st * freq);
                freq *= 2.0;
                amplitude *= 0.5;
            }
            return value;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy / uResolution.xy) * 2.0 - 1.0;
            uv.x *= uResolution.x / uResolution.y;
            uv *= 0.3;
            
            float t = uTime * 0.25;
            float waveAmp = 0.2 + 0.15 * noise2D(vec2(t, 27.7));
            float waveX = waveAmp * sin(uv.y * 4.0 + t);
            float waveY = waveAmp * sin(uv.x * 4.0 - t);
            uv.x += waveX;
            uv.y += waveY;
            
            float r = length(uv);
            float angle = atan(uv.y, uv.x);
            float swirlStrength = 1.2 * (1.0 - smoothstep(0.0, 1.0, r));
            angle += swirlStrength * sin(uTime + r * 5.0);
            uv = vec2(cos(angle), sin(angle)) * r;
            
            float n = fbm(uv);
            float swirlEffect = 0.2 * sin(t + n * 3.0);
            n += swirlEffect;
            
            float noiseVal = 0.5 * (n + 1.0);
            
            vec3 color1 = vec3(0.05, 0.02, 0.1);
            vec3 color2 = vec3(0.1, 0.06, 0.2);
            vec3 color3 = vec3(0.2, 0.2, 0.4);
            vec3 color4 = vec3(0.3, 0.4, 0.6);
            vec3 color5 = vec3(0.4, 0.65, 0.8);
            
            vec3 color;
            if (noiseVal < 0.2) {
                color = mix(color1, color2, noiseVal * 5.0);
            } else if (noiseVal < 0.4) {
                color = mix(color2, color3, (noiseVal - 0.2) * 5.0);
            } else if (noiseVal < 0.6) {
                color = mix(color3, color4, (noiseVal - 0.4) * 5.0);
            } else {
                color = mix(color4, color5, (noiseVal - 0.6) * 2.5);
            }
            
            float alpha = noiseVal < 0.1 ? 0.0 : 0.6;
            outColor = vec4(color, alpha);
        }`;

    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }

    gl.useProgram(program);

    const quadVertices = new Float32Array([
      -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
    ]);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

    const aPositionLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPositionLoc);
    gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uTimeLoc = gl.getUniformLocation(program, 'uTime');

    let startTime = performance.now();

    const render = () => {
      const currentTime = performance.now();
      const elapsed = (currentTime - startTime) * 0.001;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(uTimeLoc, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      requestAnimationFrame(render);
    };

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      gl.deleteProgram(program);
      gl.deleteBuffer(vbo);
      gl.deleteVertexArray(vao);
    };
  }, []);

  return (
    <div className={cn('relative w-full min-h-screen overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'transparent' }}
      />
      <div className="relative z-10 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
};

// Enhanced Input with Traditional Label
const EnhancedInput = React.forwardRef(({ id, label, icon: Icon, className, required, ...props }, ref) => {
  return (
    <div className="enhanced-input-wrapper">
      <Label htmlFor={id} className="enhanced-label">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {required && <span className="required-badge">必填</span>}
      </Label>
      <Input
        ref={ref}
        id={id}
        className={cn('enhanced-input', className)}
        {...props}
      />
    </div>
  );
});

// Enhanced Textarea with Traditional Label
const EnhancedTextarea = React.forwardRef(({ id, label, icon: Icon, className, required, ...props }, ref) => {
  return (
    <div className="enhanced-input-wrapper">
      <Label htmlFor={id} className="enhanced-label">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
        {required && <span className="required-badge">必填</span>}
      </Label>
      <Textarea
        ref={ref}
        id={id}
        className={cn('enhanced-textarea', className)}
        {...props}
      />
    </div>
  );
});

// Enhanced Submit Button
const EnhancedSubmitButton = ({ isSubmitting, onClick, disabled, className, ...props }) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative h-12 px-8 overflow-hidden',
        'bg-gradient-to-r from-purple-600 via-blue-600 to-purple-700',
        'hover:from-purple-700 hover:via-blue-700 hover:to-purple-800',
        'transition-all duration-300 transform hover:scale-105',
        'shadow-lg hover:shadow-xl',
        'text-white font-medium',
        'group',
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-2">
        <span>{isSubmitting ? '创建中...' : '创建梦境'}</span>
        <Wand2 className="w-4 h-4 transition-transform group-hover:rotate-12" />
      </div>
    </Button>
  );
};

const CreateDream = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const [newTagType, setNewTagType] = useState('character');
  const quillRef = useRef(null);

  // 自定义图片上传处理器
  const imageHandler = async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      try {
        const result = await uploadImage(file);

        if (result && result.url) {
          const quill = quillRef.current.getEditor();
          const range = quill.getSelection();
          quill.insertEmbed(range.index, 'image', result.url);
          quill.setSelection(range.index + 1);
        }
      } catch (error) {
        notification.error('图片上传失败');
      }
    };
  };

  // 撤销重做处理器
  const undoHandler = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.history.undo();
    }
  };

  const redoHandler = () => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.history.redo();
    }
  };

  // 工具栏中文配置
  const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ 'header': 1 }, { 'header': 2 }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'script': 'sub' }, { 'script': 'super' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['clean'],
    ['link', 'image'],
    // 添加撤销和重做按钮到工具栏
    ['undo', 'redo']
  ];

  // Quill模块配置
  const modules = {
    toolbar: {
      container: toolbarOptions,
      handlers: {
        image: imageHandler,
        undo: undoHandler,
        redo: redoHandler,
      },
    },
    // 配置历史记录模块
    history: {
      delay: 2000,        // 操作后延迟2秒计入历史记录
      maxStack: 500,      // 最大可撤销步数
      userOnly: true      // 仅捕获用户产生的更改
    }
  };

  // 添加中文工具栏提示
  useEffect(() => {
    // 注册自定义按钮和添加中文提示
    const initializeQuillExtensions = () => {
      // 注册自定义按钮图标
      const icons = Quill.import('ui/icons');
      icons['undo'] = '↶';
      icons['redo'] = '↷';

      // 添加中文工具栏提示
      const tooltips = {
        '.ql-bold': '粗体',
        '.ql-italic': '斜体',
        '.ql-underline': '下划线',
        '.ql-strike': '删除线',
        '.ql-blockquote': '引用',
        '.ql-code-block': '代码块',
        '.ql-header[value="1"]': '标题1',
        '.ql-header[value="2"]': '标题2',
        '.ql-list[value="ordered"]': '有序列表',
        '.ql-list[value="bullet"]': '无序列表',
        '.ql-script[value="sub"]': '下标',
        '.ql-script[value="super"]': '上标',
        '.ql-indent[value="-1"]': '减少缩进',
        '.ql-indent[value="+1"]': '增加缩进',
        '.ql-size[value="small"]': '小号字体',
        '.ql-size[value="large"]': '大号字体',
        '.ql-size[value="huge"]': '超大字体',
        '.ql-color': '字体颜色',
        '.ql-background': '背景颜色',
        '.ql-font': '字体',
        '.ql-align': '对齐方式',
        '.ql-clean': '清除格式',
        '.ql-link': '插入链接',
        '.ql-image': '插入图片',
        // 添加撤销和重做的中文提示
        '.ql-undo': '撤销 (Ctrl+Z)',
        '.ql-redo': '重做 (Ctrl+Y)'
      };

      Object.entries(tooltips).forEach(([selector, tooltip]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.setAttribute('title', tooltip);
        });
      });
    };

    const timer = setTimeout(initializeQuillExtensions, 100);
    return () => clearTimeout(timer);
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    categories: [],
    tags: [],
    lucidity_level: 0,
    mood_before_sleep: '',
    mood_in_dream: '',
    mood_after_waking: '',
    privacy: 'private',
    is_favorite: false,
    interpretation: '',
    personal_notes: '',
    sleep_quality: '',
    sleep_duration: '',
    bedtime: '',
    wake_time: '',
    is_recurring: false,
    recurring_elements: '',
    vividness: 3,
  });

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = '梦境标题不能为空';
    }

    if (!formData.content.trim()) {
      errors.content = '梦境内容不能为空';
    }

    if (!formData.dream_date) {
      errors.dream_date = '梦境日期不能为空';
    } else if (new Date(formData.dream_date) > new Date()) {
      errors.dream_date = '梦境日期不能是未来日期';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const toggleCategory = (category) => {
    const newCategories = formData.categories.includes(category)
      ? formData.categories.filter(c => c !== category)
      : [...formData.categories, category];

    handleFieldChange('categories', newCategories);
  };

  const addTag = () => {
    if (!newTag.trim()) {
      notification.error('标签名称不能为空');
      return;
    }

    const trimmedTag = newTag.trim();

    if (formData.tags.some(tag => tag.name === trimmedTag)) {
      notification.error('标签已存在');
      return;
    }

    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, { name: trimmedTag, tag_type: newTagType }]
    }));
    setNewTag('');
  };

  const removeTag = (tagName) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.name !== tagName)
    }));
  };

  const handleDurationChange = (value) => {
    if (value) {
      const hours = parseFloat(value);
      if (!isNaN(hours)) {
        const seconds = Math.round(hours * 3600);
        handleFieldChange('sleep_duration', seconds);
      }
    } else {
      handleFieldChange('sleep_duration', '');
    }
  };

  const getDurationHours = () => {
    if (formData.sleep_duration) {
      return (formData.sleep_duration / 3600).toFixed(1);
    }
    return '';
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      notification.error('请修正表单中的错误');
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        categories: formData.categories,
        tags: formData.tags,
        sleep_quality: formData.sleep_quality ? parseInt(formData.sleep_quality) : null,
        vividness: parseInt(formData.vividness),
      };

      const response = await api.post('/dreams/', submitData);

      if (response.data) {
        notification.success('梦境创建成功！');
        navigate(`/dreams/${response.data.id}`);
      }
    } catch (error) {
      if (error.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
        notification.error('请修正表单中的错误');
      } else {
        notification.error('创建梦境失败: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WavyBackground>
      <div className="create-dream-container">
        <div className="create-dream-header animate-fade-in">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="back-button hover:scale-110 transition-transform duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="create-dream-title animate-gradient-text">
            <Sparkles className="h-6 w-6 animate-pulse" />
            记录梦境
          </h1>
        </div>

        <Card className="create-dream-card animate-slide-up backdrop-blur-md bg-background/80">
          <CardHeader>
            <CardTitle className="text-center">
              <div className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent text-2xl font-bold">
                创建你的梦境世界
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="section-title">
                <FileText className="w-5 h-5 mr-2" />
                基础信息
              </h3>

              <div className="form-group">
                <EnhancedInput
                  id="title"
                  label="梦境标题"
                  icon={Text}
                  required
                  value={formData.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className={`transition-all duration-300 ${validationErrors.title ? 'border-red-500' : ''}`}
                  maxLength={200}
                  placeholder="请输入梦境标题..."
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.title}</p>
                )}
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label htmlFor="dream_date" className="enhanced-label">
                    <Calendar className="w-4 h-4" />
                    梦境日期
                    <span className="required-badge">必填</span>
                  </Label>
                  <Input
                    id="dream_date"
                    type="date"
                    value={formData.dream_date}
                    onChange={(e) => handleFieldChange('dream_date', e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={`enhanced-input transition-all duration-300 ${validationErrors.dream_date ? 'border-red-500' : ''}`}
                  />
                </div>
                {validationErrors.dream_date && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.dream_date}</p>
                )}
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <BookOpen className="w-4 h-4" />
                    梦境内容
                    <span className="required-badge">必填</span>
                  </Label>

                  <div className={`rich-text-editor-wrapper transition-all duration-300 ${validationErrors.content ? 'border-red-500' : ''}`}>
                    <ReactQuill
                      ref={quillRef}
                      value={formData.content}
                      onChange={(value) => handleFieldChange('content', value || '')}
                      modules={modules}
                      placeholder="开始记录你的梦境..."
                      className="quill-editor"
                    />
                  </div>
                </div>
                {validationErrors.content && (
                  <p className="text-red-500 text-sm mt-1 animate-fade-in">{validationErrors.content}</p>
                )}
              </div>


            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <h3 className="section-title">
                <Palette className="w-5 h-5 mr-2" />
                分类和标签
              </h3>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Star className="w-4 h-4" />
                    梦境分类 <span className="optional-text">(可选)</span>
                  </Label>
                  <div className="categories-grid">
                    {DREAM_CATEGORIES.map(category => (
                      <Badge
                        key={category.value}
                        variant={formData.categories.includes(category.value) ? "default" : "outline"}
                        className="category-badge cursor-pointer transition-all duration-300 hover:scale-105"
                        style={{
                          backgroundColor: formData.categories.includes(category.value) ? category.color : 'transparent',
                          borderColor: category.color,
                          color: formData.categories.includes(category.value) ? 'white' : category.color
                        }}
                        onClick={() => toggleCategory(category.value)}
                      >
                        {category.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Hash className="w-4 h-4" />
                    标签 <span className="optional-text">(可选)</span>
                  </Label>
                  <div className="tags-input-wrapper">
                    <Select value={newTagType} onValueChange={setNewTagType}>
                      <SelectTrigger className="tag-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TAG_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="添加标签..."
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="tag-input enhanced-input transition-all duration-300"
                      maxLength={50}
                    />
                    <Button onClick={addTag} size="sm" variant="secondary" className="hover:scale-105 transition-transform">
                      添加
                    </Button>
                  </div>
                  <div className="tags-list">
                    {formData.tags.map((tag, index) => (
                      <div
                        key={`${tag.name}-${index}`}
                        className="tag-badge animate-fade-in"
                      >
                        <span className="tag-type">{TAG_TYPES.find(t => t.value === tag.tag_type)?.label}:</span>
                        <span className="tag-name">{tag.name}</span>
                        <span
                          onClick={() => removeTag(tag.name)}
                          className="tag-remove"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              removeTag(tag.name);
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="section-title">
                <Brain className="w-5 h-5 mr-2" />
                梦境特征
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      清醒度等级: {formData.lucidity_level}
                    </Label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      value={formData.lucidity_level}
                      onChange={(e) => handleFieldChange('lucidity_level', parseInt(e.target.value))}
                      className="lucidity-slider"
                    />
                    <div className="lucidity-labels">
                      <span>完全无意识</span>
                      <span>超清醒状态</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      清晰度 <span className="optional-text">(可选)</span>: {formData.vividness}
                    </Label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={formData.vividness}
                      onChange={(e) => handleFieldChange('vividness', parseInt(e.target.value))}
                      className="vividness-slider"
                    />
                    <div className="vividness-labels">
                      <span>模糊</span>
                      <span>非常清晰</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <div className="checkbox-wrapper">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onChange={(e) => handleFieldChange('is_recurring', e.target.checked)}
                      className="recurring-checkbox"
                    />
                    <Label htmlFor="is_recurring" className="recurring-label">这是一个重复梦境</Label>
                  </div>
                  {formData.is_recurring && (
                    <div className="recurring-container">
                      <textarea
                        placeholder="描述重复出现的元素..."
                        value={formData.recurring_elements}
                        onChange={(e) => handleFieldChange('recurring_elements', e.target.value)}
                        className="recurring-textarea"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <h3 className="section-title">
                <Heart className="w-5 h-5 mr-2" />
                情绪状态
              </h3>

              <div className="moods-grid">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      睡前情绪 <span className="optional-text">(可选)</span>
                    </Label>
                    <Select value={formData.mood_before_sleep} onValueChange={(value) => handleFieldChange('mood_before_sleep', value)}>
                      <SelectTrigger className="transition-all duration-300">
                        <SelectValue placeholder="选择情绪" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">
                              <span className="mood-icon">{mood.icon}</span>
                              {mood.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Brain className="w-4 h-4" />
                      梦中情绪 <span className="optional-text">(可选)</span>
                    </Label>
                    <Select value={formData.mood_in_dream} onValueChange={(value) => handleFieldChange('mood_in_dream', value)}>
                      <SelectTrigger className="transition-all duration-300">
                        <SelectValue placeholder="选择情绪" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">
                              <span className="mood-icon">{mood.icon}</span>
                              {mood.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      醒后情绪 <span className="optional-text">(可选)</span>
                    </Label>
                    <Select value={formData.mood_after_waking} onValueChange={(value) => handleFieldChange('mood_after_waking', value)}>
                      <SelectTrigger className="transition-all duration-300">
                        <SelectValue placeholder="选择情绪" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map(mood => (
                          <SelectItem key={mood.value} value={mood.value}>
                            <span className="mood-option">
                              <span className="mood-icon">{mood.icon}</span>
                              {mood.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
              <h3 className="section-title">
                <Bed className="w-5 h-5 mr-2" />
                睡眠信息
              </h3>

              <div className="sleep-grid">
                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Star className="w-4 h-4" />
                      睡眠质量 <span className="optional-text">(可选)</span>
                    </Label>
                    <Select value={formData.sleep_quality} onValueChange={(value) => handleFieldChange('sleep_quality', value)}>
                      <SelectTrigger className="transition-all duration-300">
                        <SelectValue placeholder="选择睡眠质量" />
                      </SelectTrigger>
                      <SelectContent>
                        {SLEEP_QUALITY_OPTIONS.map(quality => (
                          <SelectItem key={quality.value} value={quality.value.toString()}>
                            <span className="quality-option">
                              <Star className="h-4 w-4 mr-1" />
                              {quality.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Clock className="w-4 h-4" />
                      睡眠时长 <span className="optional-text">(可选，小时)</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="24"
                      placeholder="8.5"
                      value={getDurationHours()}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Moon className="w-4 h-4" />
                      就寝时间 <span className="optional-text">(可选)</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.bedtime}
                      onChange={(e) => handleFieldChange('bedtime', e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="enhanced-input-wrapper">
                    <Label className="enhanced-label">
                      <Sun className="w-4 h-4" />
                      醒来时间 <span className="optional-text">(可选)</span>
                    </Label>
                    <Input
                      type="time"
                      value={formData.wake_time}
                      onChange={(e) => handleFieldChange('wake_time', e.target.value)}
                      className="enhanced-input transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <h3 className="section-title">
                <Wand2 className="w-5 h-5 mr-2" />
                解析和笔记
              </h3>

              <div className="form-group">
                <EnhancedTextarea
                  id="interpretation"
                  label="梦境解析"
                  icon={Brain}
                  value={formData.interpretation}
                  onChange={(e) => handleFieldChange('interpretation', e.target.value)}
                  className="transition-all duration-300"
                  rows={4}
                  placeholder="请输入梦境解析（可选）..."
                />
              </div>

              <div className="form-group">
                <EnhancedTextarea
                  id="personal_notes"
                  label="个人笔记"
                  icon={NotebookPen}
                  value={formData.personal_notes}
                  onChange={(e) => handleFieldChange('personal_notes', e.target.value)}
                  className="transition-all duration-300"
                  rows={3}
                  placeholder="请输入个人笔记（可选）..."
                />
              </div>
            </div>

            <div className="form-section animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
              <h3 className="section-title">
                <Lock className="w-5 h-5 mr-2" />
                隐私设置
              </h3>

              <div className="form-group">
                <div className="enhanced-input-wrapper">
                  <Label className="enhanced-label">
                    <Globe className="w-4 h-4" />
                    谁可以查看这个梦境
                  </Label>
                  <div className="privacy-options">
                    {PRIVACY_OPTIONS.map(option => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          className={`privacy-option transition-all duration-300 hover:scale-105 ${formData.privacy === option.value ? 'active' : ''}`}
                          onClick={() => handleFieldChange('privacy', option.value)}
                        >
                          <Icon className="h-5 w-5" />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
                className="cancel-button"
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
              <EnhancedSubmitButton
                onClick={handleSubmit}
                disabled={isSubmitting}
                isSubmitting={isSubmitting}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </WavyBackground>
  );
};

export default CreateDream; 
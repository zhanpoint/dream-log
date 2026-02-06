import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "dreamlog-language";

export const SUPPORTED_LANGUAGES = {
  "zh-CN": { nativeName: "简体中文" },
  en: { nativeName: "English" },
  ja: { nativeName: "日本語" },
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const resources = {
  "zh-CN": {
    translation: {
      common: {
        login: "登录",
        register: "注册",
        continue: "继续",
        back: "返回",
        loading: "加载中...",
        email: "邮箱",
        password: "密码",
        name: "姓名",
        settings: "进入设置",
        save: "保存",
        cancel: "取消",
        edit: "编辑",
        delete: "删除",
        confirm: "确认",
        success: "成功",
        error: "错误",
      },
      auth: {
        // 通用
        welcomeToApp: "欢迎来到 Dream Log",
        welcomeBack: "欢迎回来",
        
        // 邮箱步骤
        emailPlaceholder: "你的邮箱地址",
        namePlaceholder: "你的姓名",
        emailRequired: "请输入邮箱地址",
        emailInvalid: "请输入有效的邮箱地址",
        nameRequired: "请输入姓名",
        
        // OAuth
        continueWithGoogle: "使用 Google 继续",
        orContinueWith: "或继续使用",
        
        // 方法选择
        chooseMethod: "选择登录方式",
        chooseSignupMethod: "选择注册方式",
        useVerificationCode: "使用邮箱验证码",
        useVerificationCodeLogin: "使用邮箱验证码登录",
        useVerificationCodeSignup: "使用邮箱验证码注册",
        usePassword: "使用密码",
        usePasswordLogin: "使用密码登录",
        usePasswordSignup: "使用密码注册",
        createPassword: "创建密码",
        
        // 密码输入
        passwordPlaceholder: "输入你的密码",
        newPasswordPlaceholder: "创建一个强密码",
        confirmPasswordPlaceholder: "确认密码",
        forgotPassword: "忘记密码?",
        passwordRequired: "请输入密码",
        passwordTooShort: "密码至少需要 8 个字符",
        passwordTooWeak: "密码强度不足",
        passwordsNotMatch: "两次输入的密码不一致",
        
        // 密码强度
        passwordStrength: "密码强度",
        passwordStrengthWeak: "弱",
        passwordStrengthFair: "中等",
        passwordStrengthGood: "良好",
        passwordStrengthStrong: "强",
        passwordRequirements: "密码要求",
        passwordReqLength: "至少 8 个字符",
        passwordReqUppercase: "包含大写字母 (A-Z)",
        passwordReqLowercase: "包含小写字母 (a-z)",
        passwordReqNumber: "包含数字 (0-9)",
        passwordReqSpecial: "包含特殊符号 (@#$%^&*)",
        passwordReqNote: "需要满足: 长度 + 至少 3 种字符类型",
        
        // 验证码
        verificationCodeSent: "验证码已发送到",
        enterVerificationCode: "输入发送到 {{email}} 的验证码",
        verificationCodePlaceholder: "6 位验证码",
        verificationCodeInvalid: "无效的验证码",
        verificationCodeExpired: "验证码已过期",
        resendCode: "重新发送",
        resendCodeIn: "重新发送 ({{seconds}}秒)",
        codeRequired: "请输入验证码",
        
        // 错误提示
        emailAlreadyExists: "此邮箱已注册",
        emailNotFound: "邮箱未注册",
        invalidCredentials: "邮箱或密码错误",
        accountBlocked: "身份验证被阻止，此邮箱已注册",
        tooManyAttempts: "尝试次数过多，请稍后再试",
        networkError: "网络连接失败，请检查网络",
        unknownError: "发生未知错误，请稍后重试",
        
        // 成功提示
        loginSuccess: "登录成功",
        signupSuccess: "注册成功",
        verificationSuccess: "验证成功",
        passwordResetSuccess: "密码重置成功",
        
        // 操作按钮
        signIn: "登录",
        signUp: "注册",
        verify: "验证",
        submit: "提交",
        cancel: "取消",
        
        // 密码未设置提示
        passwordNotSet: "尚未设置密码",
        passwordNotSetDesc: "您的账户还没有设置密码，是否现在设置密码？设置后需要验证邮箱验证码完成登录。",
        setPasswordNow: "设置密码",
        useCodeInstead: "使用验证码登录",
        
        // 切换提示
        haveAccount: "已有账户?",
        noAccount: "还没有账户?",
        switchToLogin: "前往登录",
        switchToSignup: "前往注册",
        
        // 其他
        backToHome: "返回首页",
        termsAgree: "继续即表示你同意我们的",
        terms: "服务条款",
        and: "和",
        privacy: "隐私政策",
      },
      settings: {
        title: "设置",
        // 侧边栏菜单
        sidebar: {
          profile: "个人资料",
          account: "账户安全",
        },
        // 个人资料
        profile: {
          title: "个人资料",
          subtitle: "管理你的公开资料信息",
          avatar: "头像",
          changeAvatar: "更换头像",
          username: "用户名",
          usernamePlaceholder: "输入用户名",
          usernameHint: "3-20个字符，只能包含字母、数字和下划线",
          usernameAvailable: "用户名可用",
          usernameTaken: "用户名已被占用",
          bio: "个人简介",
          bioPlaceholder: "介绍一下你自己...",
          bioHint: "最多100个字符",
          birthday: "生日",
          birthdayPlaceholder: "选择你的生日",
          yearPlaceholder: "年",
          monthPlaceholder: "月",
          dayPlaceholder: "日",
          year: "年",
          month: "月",
          day: "日",
          updateSuccess: "个人资料更新成功",
          updateError: "更新失败，请重试",
        },
        // 头像上传
        avatar: {
          uploadTitle: "上传头像",
          uploadDescription: "选择一张图片作为你的头像，支持 JPG、PNG、WebP 格式",
          uploadSubtitle: "选择一张图片作为你的头像",
          selectImage: "选择图片",
          cropImage: "裁剪图片",
          uploading: "上传中...",
          uploadSuccess: "头像上传成功",
          uploadError: "上传失败，请重试",
          fileTooLarge: "文件大小不能超过5MB",
          invalidFormat: "仅支持 JPG、PNG 格式",
          dragAndDrop: "拖拽图片到此处或点击选择",
          zoom: "缩放",
        },
        // 账户安全
        account: {
          title: "账户安全",
          changePassword: "修改密码",
          currentPassword: "当前密码",
          newPassword: "新密码",
          confirmPassword: "确认新密码",
          useVerificationCode: "使用验证码验证",
          useOldPassword: "使用旧密码",
          passwordChangeSuccess: "密码修改成功",
          passwordChangeError: "修改失败，请重试",
          passwordMismatch: "两次输入的密码不一致",
          passwordMinLength: "密码至少需要 8 个字符",
          passwordSameAsOld: "新密码不能与当前密码相同",
          passwordRequired: "请输入密码",
          allFieldsRequired: "请填写所有必填字段",
          passwordStrengthNotMet: "密码强度不符合要求",
          confirmPasswordRequired: "请确认新密码",
          confirmPasswordMismatch: "确认密码与新密码不一致",
        },
        // 邮箱管理
        email: {
          title: "邮箱管理",
          subtitle: "管理你的登录邮箱",
          currentEmail: "当前邮箱",
          newEmail: "新邮箱",
          verificationCode: "验证码",
          sendCode: "发送验证码",
          emailChangeSuccess: "邮箱修改成功",
          emailChangeError: "修改失败，请重试",
          changeEmail: "修改邮箱",
          codeSent: "验证码已发送到您的邮箱",
          codeSentToNew: "验证码已发送到新邮箱",
          sendCodeError: "发送验证码失败",
          enterNewEmail: "请先输入新邮箱地址",
          codeInvalid: "验证码必须是6位数字",
          emailInvalid: "请输入有效的邮箱地址",
          codePlaceholder: "6位验证码",
        },
        // 外观设置
        appearance: {
          title: "外观设置",
          subtitle: "自定义你的使用体验",
          theme: "主题",
          themeLight: "浅色",
          themeDark: "深色",
          themeSystem: "跟随系统",
          language: "语言",
        },
      },
      marketing: {
        hero: {
          tag: "✨ 探索你的梦境世界",
          titleLine1: "记录每一个梦境",
          titleLine2: "探索潜意识的奥秘",
          subtitleLine1: "使用 AI 技术分析你的梦境，发现隐藏的模式和意义",
          subtitleLine2: "让 Dream Log 成为自我探索的起点",
          cta: "立即开始记录",
        },
        features: {
          heading: "强大的功能",
          subheading: "让梦境记录变得简单而有意义",
          items: {
            ai: {
              title: "AI 梦境分析",
              description:
                "利用先进的 AI 技术，深入分析梦境内容，发现隐藏的含义和模式",
            },
            calendar: {
              title: "梦境日历",
              description:
                "在时间轴上记录和追踪你的梦境，发现梦境与生活事件的关联",
            },
            stats: {
              title: "数据统计",
              description: "可视化展示梦境统计数据，了解你的睡眠和梦境模式",
            },
            tips: {
              title: "智能提示",
              description: "基于你的梦境历史，提供个性化的洞察和建议",
            },
          },
        },
        testimonials: {
          heading: "深受全球梦境探索者喜爱",
          stats: {
            users: "活跃用户",
            dreams: "梦境记录",
            satisfaction: "满意度",
          },
          reviews: {
            1: "Dream Log 帮助我更好地理解自己的梦境，AI 分析非常准确！",
            2: "界面设计很美观，记录梦境变得很有趣，推荐给所有对梦境感兴趣的朋友！",
            3: "从来没想过梦境可以这样被分析，每天都期待看到新的解析结果。",
            4: "作为一个经常做奇怪梦的人，这个应用让我找到了很多有趣的解释！",
            5: "AI 助手的建议很有帮助，让我对自己的心理状态有了更深的认识。",
            6: "数据统计功能很棒，可以看到自己梦境的变化趋势，很有科学感！",
            7: "终于有一个专业的梦境记录工具了，比纸质日记方便太多！",
            8: "梦境解析的准确度让我惊讶，感觉像有一个专业的心理学家在身边。",
          },
        },
      },
      footer: {
        tagline: "记录和探索你的梦境世界",
        sections: {
          product: "产品",
          resources: "资源",
          legal: "法律",
        },
        items: {
          features: "功能特性",
          statistics: "数据统计",
          about: "关于我们",
          docs: "使用文档",
          blog: "博客",
          help: "帮助中心",
          terms: "服务条款",
          privacy: "隐私政策",
        },
      },
    },
  },
  en: {
    translation: {
      common: {
        login: "Login",
        register: "Sign up",
        continue: "Continue",
        back: "Back",
        loading: "Loading...",
        email: "Email",
        password: "Password",
        name: "Name",
        settings: "Go to Settings",
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        confirm: "Confirm",
        success: "Success",
        error: "Error",
      },
      auth: {
        // General
        welcomeToApp: "Welcome to Dream Log",
        welcomeBack: "Welcome back",
        
        // Email step
        emailPlaceholder: "Your email address",
        namePlaceholder: "Your name",
        emailRequired: "Please enter your email",
        emailInvalid: "Please enter a valid email",
        nameRequired: "Please enter your name",
        
        // OAuth
        continueWithGoogle: "Continue with Google",
        orContinueWith: "Or continue with",
        
        // Method selection
        chooseMethod: "Choose login method",
        chooseSignupMethod: "Choose signup method",
        useVerificationCode: "Use email verification code",
        useVerificationCodeLogin: "Use email code to sign in",
        useVerificationCodeSignup: "Use email code to sign up",
        usePassword: "Use password",
        usePasswordLogin: "Sign in with password",
        usePasswordSignup: "Sign up with password",
        createPassword: "Create password",
        
        // Password input
        passwordPlaceholder: "Enter your password",
        newPasswordPlaceholder: "Create a strong password",
        confirmPasswordPlaceholder: "Confirm password",
        forgotPassword: "Forgot password?",
        passwordRequired: "Please enter your password",
        passwordTooShort: "Password must be at least 8 characters",
        passwordTooWeak: "Password is too weak",
        passwordsNotMatch: "Passwords do not match",
        
        // Password strength
        passwordStrength: "Password strength",
        passwordStrengthWeak: "Weak",
        passwordStrengthFair: "Fair",
        passwordStrengthGood: "Good",
        passwordStrengthStrong: "Strong",
        passwordRequirements: "Password requirements",
        passwordReqLength: "At least 8 characters",
        passwordReqUppercase: "Include uppercase letter (A-Z)",
        passwordReqLowercase: "Include lowercase letter (a-z)",
        passwordReqNumber: "Include number (0-9)",
        passwordReqSpecial: "Include special character (@#$%^&*)",
        passwordReqNote: "Must meet: length + at least 3 character types",
        
        // Verification code
        verificationCodeSent: "Verification code sent to",
        enterVerificationCode: "Enter the code sent to {{email}}",
        verificationCodePlaceholder: "6-digit code",
        verificationCodeInvalid: "Invalid verification code",
        verificationCodeExpired: "Verification code expired",
        resendCode: "Resend code",
        resendCodeIn: "Resend in {{seconds}}s",
        codeRequired: "Please enter the verification code",
        
        // Error messages
        emailAlreadyExists: "This email is already registered",
        emailNotFound: "Email not found",
        invalidCredentials: "Invalid email or password",
        accountBlocked: "Authentication blocked, this email is already registered",
        tooManyAttempts: "Too many attempts, please try again later",
        networkError: "Network connection failed, please check your connection",
        unknownError: "An unknown error occurred, please try again later",
        
        // Success messages
        loginSuccess: "Login successful",
        signupSuccess: "Signup successful",
        verificationSuccess: "Verification successful",
        passwordResetSuccess: "Password reset successful",
        
        // Action buttons
        signIn: "Sign In",
        signUp: "Sign Up",
        verify: "Verify",
        submit: "Submit",
        cancel: "Cancel",
        
        // Password not set prompt
        passwordNotSet: "Password Not Set",
        passwordNotSetDesc: "You haven't set a password for this account yet. Would you like to set one now? You'll need to verify your email after setting the password.",
        setPasswordNow: "Set Password",
        useCodeInstead: "Use Verification Code",
        
        // Switch prompts
        haveAccount: "Already have an account?",
        noAccount: "Don't have an account?",
        switchToLogin: "Go to login",
        switchToSignup: "Go to signup",
        
        // Others
        backToHome: "Back to home",
        termsAgree: "By continuing, you agree to our",
        terms: "Terms of Service",
        and: "and",
        privacy: "Privacy Policy",
      },
      settings: {
        title: "Settings",
        sidebar: {
          profile: "Profile",
          account: "Account Security",
        },
        profile: {
          title: "Profile",
          subtitle: "Manage your public profile information",
          avatar: "Avatar",
          changeAvatar: "Change Avatar",
          username: "Username",
          usernamePlaceholder: "Enter username",
          usernameHint: "3-20 characters, letters, numbers and underscores only",
          usernameAvailable: "Username available",
          usernameTaken: "Username taken",
          bio: "Bio",
          bioPlaceholder: "Tell us about yourself...",
          bioHint: "Up to 100 characters",
          birthday: "Birthday",
          birthdayPlaceholder: "Select your birthday",
          yearPlaceholder: "Year",
          monthPlaceholder: "Month",
          dayPlaceholder: "Day",
          year: "year",
          month: "month",
          day: "day",
          updateSuccess: "Profile updated successfully",
          updateError: "Update failed, please try again",
        },
        avatar: {
          uploadTitle: "Upload Avatar",
          uploadDescription: "Choose an image for your avatar, JPG, PNG and WebP formats supported",
          uploadSubtitle: "Choose an image for your avatar",
          selectImage: "Select Image",
          cropImage: "Crop Image",
          uploading: "Uploading...",
          uploadSuccess: "Avatar uploaded successfully",
          uploadError: "Upload failed, please try again",
          fileTooLarge: "File size must be less than 5MB",
          invalidFormat: "Only JPG, PNG formats supported",
          dragAndDrop: "Drag and drop image here or click to select",
          zoom: "Zoom",
        },
        account: {
          title: "Account Security",
          changePassword: "Change Password",
          currentPassword: "Current Password",
          newPassword: "New Password",
          confirmPassword: "Confirm New Password",
          useVerificationCode: "Use verification code",
          useOldPassword: "Use old password",
          passwordChangeSuccess: "Password changed successfully",
          passwordChangeError: "Change failed, please try again",
          passwordMismatch: "Passwords do not match",
          passwordMinLength: "Password must be at least 8 characters",
          passwordSameAsOld: "New password must be different from old password",
          passwordRequired: "Please enter password",
          allFieldsRequired: "Please fill in all required fields",
          passwordStrengthNotMet: "Password does not meet strength requirements",
          confirmPasswordRequired: "Please confirm new password",
          confirmPasswordMismatch: "Confirm password does not match new password",
        },
        email: {
          title: "Email Management",
          subtitle: "Manage your login email",
          currentEmail: "Current Email",
          newEmail: "New Email",
          verificationCode: "Verification Code",
          sendCode: "Send Code",
          emailChangeSuccess: "Email changed successfully",
          emailChangeError: "Change failed, please try again",
          changeEmail: "Change Email",
          codeSent: "Verification code sent to your email",
          codeSentToNew: "Verification code sent to new email",
          sendCodeError: "Failed to send verification code",
          enterNewEmail: "Please enter new email address first",
          codeInvalid: "Verification code must be 6 digits",
          emailInvalid: "Please enter a valid email address",
          codePlaceholder: "6-digit code",
        },
        appearance: {
          title: "Appearance",
          subtitle: "Customize your experience",
          theme: "Theme",
          themeLight: "Light",
          themeDark: "Dark",
          themeSystem: "System",
          language: "Language",
        },
      },
      marketing: {
        hero: {
          tag: "✨ Explore Your Dream World",
          titleLine1: "Capture Every Dream",
          titleLine2: "Unveil the Subconscious",
          subtitleLine1:
            "Analyze your dreams with AI to discover hidden patterns and meanings",
          subtitleLine2: "Let Dream Log be the start of self-discovery",
          cta: "Start Journaling",
        },
        features: {
          heading: "Powerful Features",
          subheading: "Make dream journaling simple and meaningful",
          items: {
            ai: {
              title: "AI Dream Analysis",
              description:
                "Use advanced AI to analyze dream content and uncover hidden patterns",
            },
            calendar: {
              title: "Dream Calendar",
              description:
                "Track your dreams on a timeline and connect them with life events",
            },
            stats: {
              title: "Insights & Stats",
              description: "Visualize dream data to understand your sleep patterns",
            },
            tips: {
              title: "Smart Suggestions",
              description:
                "Get personalized insights and recommendations based on your history",
            },
          },
        },
        testimonials: {
          heading: "Loved by Dream Explorers Worldwide",
          stats: {
            users: "Active users",
            dreams: "Dream entries",
            satisfaction: "Satisfaction",
          },
          reviews: {
            1: "Dream Log helps me understand my dreams better. The AI analysis is spot on!",
            2: "Beautiful UI. Dream journaling is fun now — highly recommended!",
            3: "I never thought dreams could be analyzed like this. I look forward to it every day.",
            4: "As someone who has weird dreams, this app gives me lots of interesting explanations!",
            5: "The AI assistant's suggestions are helpful. I learned more about my mental state.",
            6: "Great stats feature — I can see trends in my dreams. Feels very scientific!",
            7: "Finally a professional dream journal. Much more convenient than paper notes.",
            8: "The accuracy surprised me. It feels like having a psychologist by my side.",
          },
        },
      },
      footer: {
        tagline: "Record and explore your dream world",
        sections: {
          product: "Product",
          resources: "Resources",
          legal: "Legal",
        },
        items: {
          features: "Features",
          statistics: "Statistics",
          about: "About",
          docs: "Docs",
          blog: "Blog",
          help: "Help Center",
          terms: "Terms",
          privacy: "Privacy",
        },
      },
    },
  },
  ja: {
    translation: {
      common: {
        login: "ログイン",
        register: "登録",
        continue: "続ける",
        back: "戻る",
        loading: "読み込み中...",
        email: "メール",
        password: "パスワード",
        name: "名前",
        settings: "設定に移動",
        save: "保存",
        cancel: "キャンセル",
        edit: "編集",
        delete: "削除",
        confirm: "確認",
        success: "成功",
        error: "エラー",
      },
      auth: {
        // 一般
        welcomeToApp: "Dream Log へようこそ",
        welcomeBack: "おかえりなさい",
        
        // メールステップ
        emailPlaceholder: "メールアドレス",
        namePlaceholder: "お名前",
        emailRequired: "メールアドレスを入力してください",
        emailInvalid: "有効なメールアドレスを入力してください",
        nameRequired: "名前を入力してください",
        
        // OAuth
        continueWithGoogle: "Google で続ける",
        orContinueWith: "または次の方法で続ける",
        
        // 方法選択
        chooseMethod: "ログイン方法を選択",
        chooseSignupMethod: "登録方法を選択",
        useVerificationCode: "メール確認コードを使用",
        useVerificationCodeLogin: "メール確認コードでログイン",
        useVerificationCodeSignup: "メール確認コードで登録",
        usePassword: "パスワードを使用",
        usePasswordLogin: "パスワードでログイン",
        usePasswordSignup: "パスワードで登録",
        createPassword: "パスワードを作成",
        
        // パスワード入力
        passwordPlaceholder: "パスワードを入力",
        newPasswordPlaceholder: "強力なパスワードを作成",
        confirmPasswordPlaceholder: "パスワードを確認",
        forgotPassword: "パスワードをお忘れですか?",
        passwordRequired: "パスワードを入力してください",
        passwordTooShort: "パスワードは8文字以上必要です",
        passwordTooWeak: "パスワードが弱すぎます",
        passwordsNotMatch: "パスワードが一致しません",
        
        // パスワード強度
        passwordStrength: "パスワード強度",
        passwordStrengthWeak: "弱い",
        passwordStrengthFair: "普通",
        passwordStrengthGood: "良好",
        passwordStrengthStrong: "強い",
        passwordRequirements: "パスワード要件",
        passwordReqLength: "8文字以上",
        passwordReqUppercase: "大文字を含む (A-Z)",
        passwordReqLowercase: "小文字を含む (a-z)",
        passwordReqNumber: "数字を含む (0-9)",
        passwordReqSpecial: "特殊文字を含む (@#$%^&*)",
        passwordReqNote: "必要条件: 長さ + 3種類以上の文字タイプ",
        
        // 確認コード
        verificationCodeSent: "確認コードを送信しました",
        enterVerificationCode: "{{email}} に送信されたコードを入力",
        verificationCodePlaceholder: "6桁のコード",
        verificationCodeInvalid: "無効な確認コード",
        verificationCodeExpired: "確認コードの有効期限が切れました",
        resendCode: "再送信",
        resendCodeIn: "再送信 ({{seconds}}秒)",
        codeRequired: "確認コードを入力してください",
        
        // エラーメッセージ
        emailAlreadyExists: "このメールは既に登録されています",
        emailNotFound: "メールアドレスが見つかりません",
        invalidCredentials: "メールアドレスまたはパスワードが正しくありません",
        accountBlocked: "認証がブロックされました。このメールは既に登録されています",
        tooManyAttempts: "試行回数が多すぎます。後でもう一度お試しください",
        networkError: "ネットワーク接続に失敗しました。接続を確認してください",
        unknownError: "不明なエラーが発生しました。後でもう一度お試しください",
        
        // 成功メッセージ
        loginSuccess: "ログインに成功しました",
        signupSuccess: "登録に成功しました",
        verificationSuccess: "確認に成功しました",
        passwordResetSuccess: "パスワードのリセットに成功しました",
        
        // アクションボタン
        signIn: "ログイン",
        signUp: "登録",
        verify: "確認",
        submit: "送信",
        cancel: "キャンセル",
        
        // パスワード未設定プロンプト
        passwordNotSet: "パスワード未設定",
        passwordNotSetDesc: "このアカウントにはまだパスワードが設定されていません。今すぐ設定しますか？パスワード設定後、メール確認が必要です。",
        setPasswordNow: "パスワードを設定",
        useCodeInstead: "確認コードを使用",
        
        // 切り替えプロンプト
        haveAccount: "既にアカウントをお持ちですか?",
        noAccount: "アカウントをお持ちでないですか?",
        switchToLogin: "ログインへ",
        switchToSignup: "登録へ",
        
        // その他
        backToHome: "ホームに戻る",
        termsAgree: "続行することで、当社の",
        terms: "利用規約",
        and: "と",
        privacy: "プライバシーポリシー",
      },
      settings: {
        title: "設定",
        sidebar: {
          profile: "プロフィール",
          account: "アカウントセキュリティ",
        },
        profile: {
          title: "プロフィール",
          subtitle: "公開プロフィール情報を管理",
          avatar: "アバター",
          changeAvatar: "アバターを変更",
          username: "ユーザー名",
          usernamePlaceholder: "ユーザー名を入力",
          usernameHint: "3〜20文字、英数字とアンダースコアのみ",
          usernameAvailable: "ユーザー名は利用可能です",
          usernameTaken: "ユーザー名は既に使用されています",
          bio: "自己紹介",
          bioPlaceholder: "自己紹介を入力...",
          bioHint: "最大100文字",
          birthday: "誕生日",
          birthdayPlaceholder: "誕生日を選択",
          yearPlaceholder: "年",
          monthPlaceholder: "月",
          dayPlaceholder: "日",
          year: "年",
          month: "月",
          day: "日",
          updateSuccess: "プロフィールを更新しました",
          updateError: "更新に失敗しました、再試行してください",
        },
        avatar: {
          uploadTitle: "アバターをアップロード",
          uploadDescription: "アバター画像を選択してください（JPG、PNG、WebP形式対応）",
          uploadSubtitle: "アバター画像を選択",
          selectImage: "画像を選択",
          cropImage: "画像をトリミング",
          uploading: "アップロード中...",
          uploadSuccess: "アバターをアップロードしました",
          uploadError: "アップロードに失敗しました",
          fileTooLarge: "ファイルサイズは5MB以下にしてください",
          invalidFormat: "JPG、PNG形式のみ対応",
          dragAndDrop: "画像をドラッグ＆ドロップまたはクリックして選択",
          zoom: "ズーム",
        },
        account: {
          title: "アカウントセキュリティ",
          changePassword: "パスワードを変更",
          currentPassword: "現在のパスワード",
          newPassword: "新しいパスワード",
          confirmPassword: "新しいパスワードを確認",
          useVerificationCode: "確認コードを使用",
          useOldPassword: "旧パスワードを使用",
          passwordChangeSuccess: "パスワードを変更しました",
          passwordChangeError: "変更に失敗しました",
          passwordMismatch: "パスワードが一致しません",
          passwordMinLength: "パスワードは8文字以上必要です",
          passwordSameAsOld: "新しいパスワードは旧パスワードと異なる必要があります",
          passwordRequired: "パスワードを入力してください",
          allFieldsRequired: "すべての必須フィールドを入力してください",
          passwordStrengthNotMet: "パスワード強度が要件を満たしていません",
          confirmPasswordRequired: "新しいパスワードを確認してください",
          confirmPasswordMismatch: "確認パスワードが新しいパスワードと一致しません",
        },
        email: {
          title: "メール管理",
          subtitle: "ログインメールを管理",
          currentEmail: "現在のメール",
          newEmail: "新しいメール",
          verificationCode: "確認コード",
          sendCode: "コードを送信",
          emailChangeSuccess: "メールを変更しました",
          emailChangeError: "変更に失敗しました",
          changeEmail: "メールを変更",
          codeSent: "確認コードをメールに送信しました",
          codeSentToNew: "確認コードを新しいメールに送信しました",
          sendCodeError: "確認コードの送信に失敗しました",
          enterNewEmail: "まず新しいメールアドレスを入力してください",
          codeInvalid: "確認コードは6桁の数字である必要があります",
          emailInvalid: "有効なメールアドレスを入力してください",
          codePlaceholder: "6桁のコード",
        },
        appearance: {
          title: "外観",
          subtitle: "使用体験をカスタマイズ",
          theme: "テーマ",
          themeLight: "ライト",
          themeDark: "ダーク",
          themeSystem: "システム",
          language: "言語",
        },
      },
      marketing: {
        hero: {
          tag: "✨ 夢の世界を探索しよう",
          titleLine1: "すべての夢を記録",
          titleLine2: "無意識の秘密を解き明かす",
          subtitleLine1:
            "AIで夢を分析し、隠れたパターンや意味を発見します",
          subtitleLine2: "Dream Logを自己探求の出発点に",
          cta: "今すぐ始める",
        },
        features: {
          heading: "強力な機能",
          subheading: "夢の記録をシンプルで意味のある体験に",
          items: {
            ai: {
              title: "AI夢解析",
              description:
                "先進的なAIで夢の内容を分析し、隠れた意味とパターンを発見します",
            },
            calendar: {
              title: "夢カレンダー",
              description:
                "タイムラインで夢を追跡し、出来事との関連を見つけます",
            },
            stats: {
              title: "データ分析",
              description: "夢の統計を可視化し、睡眠パターンを理解します",
            },
            tips: {
              title: "スマートヒント",
              description:
                "履歴に基づいてパーソナライズされた洞察と提案を提供します",
            },
          },
        },
        testimonials: {
          heading: "世界中の夢の探究者に愛されています",
          stats: {
            users: "アクティブユーザー",
            dreams: "夢の記録",
            satisfaction: "満足度",
          },
          reviews: {
            1: "Dream Logのおかげで夢をより深く理解できました。AI解析が的確です！",
            2: "UIが美しく、夢の記録が楽しくなりました。おすすめです！",
            3: "夢をここまで分析できるとは思いませんでした。毎日結果を見るのが楽しみです。",
            4: "変な夢をよく見る私にとって、とても面白い解釈が得られます！",
            5: "AIアシスタントの提案が役立ち、自分の心理状態をより理解できました。",
            6: "統計機能が素晴らしく、夢の傾向が見えて科学的です！",
            7: "やっと本格的な夢の記録ツールが出ました。紙の日記より便利です。",
            8: "解析の精度に驚きました。心理学者がそばにいるようです。",
          },
        },
      },
      footer: {
        tagline: "夢の世界を記録し、探索する",
        sections: {
          product: "製品",
          resources: "リソース",
          legal: "法的",
        },
        items: {
          features: "機能",
          statistics: "統計",
          about: "私たちについて",
          docs: "ドキュメント",
          blog: "ブログ",
          help: "ヘルプ",
          terms: "利用規約",
          privacy: "プライバシー",
        },
      },
    },
  },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: "zh-CN",
    fallbackLng: "zh-CN",
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    interpolation: { escapeValue: false },
  });
}

export default i18n;

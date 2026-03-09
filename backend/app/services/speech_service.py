"""
语音转录统一调度层

通过环境变量 VOICE_TRANSCRIBE_PROVIDER 控制使用哪个 provider:
  - "google": Google Cloud Speech-to-Text V2
  - "xfyun": 讯飞星火实时语音转写大模型
"""

import json
import logging
from collections.abc import AsyncIterator

from app.core.config import settings

logger = logging.getLogger(__name__)


class SpeechService:
    """语音转录统一入口（代理模式）"""

    def __init__(self) -> None:
        self._provider = settings.voice_transcribe_provider
        self._google_service = None
        self._xfyun_service = None
        logger.info("语音转录 Provider: %s", self._provider)

    def _get_google_service(self):
        """懒加载 Google Cloud Speech 服务"""
        if self._google_service is None:
            from google.cloud.speech_v2 import SpeechAsyncClient
            from google.cloud.speech_v2.types import cloud_speech as speech_types  # noqa: F401
            from google.oauth2 import service_account

            project_id = settings.google_cloud_project
            if not project_id:
                raise RuntimeError("GOOGLE_CLOUD_PROJECT 未配置")

            credentials = None
            if settings.google_cloud_credentials_json:
                creds_dict = json.loads(settings.google_cloud_credentials_json)
                credentials = service_account.Credentials.from_service_account_info(creds_dict)

            self._google_service = {
                "project_id": project_id,
                "credentials": credentials,
                "SpeechAsyncClient": SpeechAsyncClient,
                "speech_types": speech_types,
            }
        return self._google_service

    def _get_xfyun_service(self):
        """懒加载讯飞语音转写服务"""
        if self._xfyun_service is None:
            from app.services.xfyun_speech_service import XfyunSpeechService
            self._xfyun_service = XfyunSpeechService()
        return self._xfyun_service

    async def streaming_transcribe(
        self,
        audio_stream: AsyncIterator[bytes],
        *,
        language_code: str = "zh-CN",
        sample_rate: int = 16000,
    ) -> AsyncIterator[str]:
        """
        流式转录音频（根据 provider 自动路由）

        Args:
            audio_stream: 异步音频数据流（16-bit PCM）
            language_code: 语言代码
            sample_rate: 采样率（Hz）

        Yields:
            转录文本片段
        """
        if self._provider == "google":
            async for text in self._google_streaming(
                audio_stream, language_code=language_code, sample_rate=sample_rate
            ):
                yield text
        else:
            service = self._get_xfyun_service()
            async for text in service.streaming_transcribe(
                audio_stream, language_code=language_code, sample_rate=sample_rate
            ):
                yield text

    async def _google_streaming(
        self,
        audio_stream: AsyncIterator[bytes],
        *,
        language_code: str,
        sample_rate: int,
    ) -> AsyncIterator[str]:
        """Google Cloud Speech-to-Text V2 流式转录"""
        svc = self._get_google_service()
        speech_types = svc["speech_types"]
        SpeechAsyncClient = svc["SpeechAsyncClient"]

        if svc["credentials"]:
            client = SpeechAsyncClient(credentials=svc["credentials"])
        else:
            client = SpeechAsyncClient()

        recognizer = f"projects/{svc['project_id']}/locations/global/recognizers/_"

        recognition_config = speech_types.RecognitionConfig(
            explicit_decoding_config=speech_types.ExplicitDecodingConfig(
                encoding=speech_types.ExplicitDecodingConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=sample_rate,
                audio_channel_count=1,
            ),
            language_codes=[language_code],
            model="chirp_2",
        )

        streaming_config = speech_types.StreamingRecognitionConfig(
            config=recognition_config,
            streaming_features=speech_types.StreamingRecognitionFeatures(
                interim_results=True,
            ),
        )

        config_request = speech_types.StreamingRecognizeRequest(
            recognizer=recognizer,
            streaming_config=streaming_config,
        )

        async def request_generator():
            yield config_request
            async for chunk in audio_stream:
                if chunk:
                    yield speech_types.StreamingRecognizeRequest(audio=chunk)

        responses = await client.streaming_recognize(requests=request_generator())

        async for response in responses:
            for result in response.results:
                if result.alternatives and result.alternatives[0].transcript:
                    transcript = result.alternatives[0].transcript.strip()
                    if transcript:
                        yield transcript


speech_service = SpeechService()

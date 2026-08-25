/**
 * @ameva/sentinel-risk-core
 * Heuristic Natural Language Profiling & Persona Diagnostic Engine
 */

import type { ForensicFootprint, HeuristicVerdict, VisitorPersona } from './types.js';

export class HeuristicProfileEngine {
  /**
   * Evaluate forensic footprint and produce an automated natural language verdict.
   */
  static profileSession(footprint: ForensicFootprint): HeuristicVerdict {
    const reasons: string[] = [];
    const tags: string[] = [];
    let persona: VisitorPersona = 'DESKTOP_STANDARD';
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    let confidence = 0.70;

    const renderer = (footprint.webglRenderer || '').toLowerCase();
    const vendor = (footprint.webglVendor || '').toLowerCase();
    const fonts = (footprint.installedFonts || '').toLowerCase();
    const visitCount = Number(footprint.totalVisitCount || 1);
    const country = footprint.country || 'GLOBAL';
    const city = footprint.city || 'Edge';
    const hz = Number(footprint.screenHz || 60);
    const isCharging = footprint.isCharging === true;
    const battery = Number(footprint.batteryLevel || 100);

    // 1. Check for AI Agents & Automated Scrapers
    if (footprint.triageCategory === 'AI_AGENT') {
      persona = 'HEADLESS_SCRAPER';
      riskLevel = 'MEDIUM';
      confidence = 0.95;
      tags.push('AI_Agent', 'LLM_Crawler', footprint.vendorGroup || 'AI_Vendor');
      reasons.push('Identified verified AI model/agent signature (' + (footprint.vendorGroup || 'AI_Agent') + ').');
    } else if (footprint.triageCategory === 'CRAWLER_TOOL' && footprint.vendorGroup === 'CLITool') {
      persona = 'HEADLESS_SCRAPER';
      riskLevel = 'HIGH';
      confidence = 0.90;
      tags.push('CLI_Client', 'Automated_Script', footprint.vendorGroup);
      reasons.push('Identified non-browser HTTP CLI client (cURL/Python/Scraper).');
    }

    // 2. Check for Virtual / Headless Cloud Renderers & VPN / Datacenter Proxies
    const isCloudHeadless =
      renderer.includes('swiftshader') ||
      renderer.includes('llvmpipe') ||
      renderer.includes('subzero') ||
      renderer.includes('softpipe') ||
      renderer.includes('virtualbox') ||
      renderer.includes('vmware') ||
      renderer.includes('mesa offscreen');

    if (isCloudHeadless) {
      persona = 'CLOUD_AUTOMATION_BOT';
      riskLevel = 'HIGH';
      confidence = 0.95;
      tags.push('Headless_Browser', 'Virtual_GPU', 'Cloud_Infrastructure');
      reasons.push('Detected software CPU-emulated WebGL renderer (' + (footprint.webglRenderer || 'SwiftShader') + ').');
    } else if (renderer === 'unknown' || renderer === 'server-http-client') {
      if (country === 'US' && (city.includes('Ashburn') || city.includes('Boydton') || city.includes('Dallas'))) {
        persona = 'HEADLESS_SCRAPER';
        riskLevel = 'MEDIUM';
        confidence = 0.85;
        tags.push('Datacenter_Proxy', 'GPU_Disabled');
        reasons.push('Hardware GPU acceleration is disabled on major datacenter IP range.');
      } else if (country === 'DATACENTER' || country === 'VPN') {
        persona = 'DATACENTER_PROXY';
        riskLevel = 'HIGH';
        confidence = 0.88;
        tags.push('Datacenter_Proxy', 'VPN_Exit_Node', 'GPU_Disabled');
        reasons.push('Hardware GPU acceleration is disabled on known datacenter / VPN proxy exit IP range.');
      }
    }

    // 3. Check for Software Engineering & Developer Environments
    const devFontMatches = [
      'd2coding',
      'cascadia code',
      'consolas',
      'fira code',
      'jetbrains mono',
      'monaco'
    ].filter(f => fonts.includes(f));

    if (devFontMatches.length >= 2 && !isCloudHeadless && persona === 'DESKTOP_STANDARD') {
      persona = 'SOFTWARE_ENGINEER';
      riskLevel = 'LOW';
      confidence = 0.90;
      tags.push('Developer_Environment', 'IDE_Fonts');
      reasons.push('Installed programmer fonts detected: [' + devFontMatches.join(', ') + '].');
    }

    // 4. Check for Retention & Power Users
    if (visitCount >= 5 && !isCloudHeadless && persona === 'DESKTOP_STANDARD') {
      persona = 'POWER_USER';
      tags.push('High_Retention', 'Visits_' + visitCount);
      reasons.push('High engagement session with ' + visitCount + ' accumulated site visits.');
    }

    // 5. Check Power & Hardware Attributes
    if (isCharging && battery >= 90) {
      tags.push('AC_Powered', 'Workstation');
    }
    if (hz >= 120) {
      tags.push('High_Refresh_Display', hz + 'Hz');
    }

    // 6. Generate Natural Language Executive Narrative
    let summaryNarrative = '';
    const locStr = country + ' (' + city + ')';

    if (footprint.triageCategory === 'AI_AGENT') {
      summaryNarrative = '[AI 에이전트/LLM 크롤러] ' + locStr + '에서 ' + (footprint.vendorGroup || 'AI Bot') + ' 계열의 AI 검색/인덱싱 봇이 진입하여 문서를 수집한 에이전트 세션입니다.';
    } else if (persona === 'CLOUD_AUTOMATION_BOT') {
      summaryNarrative = '[자동화 봇 의심] ' + locStr + ' 클라우드 데이터센터 환경에서 가상 렌더러(' + (footprint.webglRenderer || 'SwiftShader') + ')를 통해 페이지를 스크레이핑한 헤드리스 봇 세션입니다.';
    } else if (persona === 'DATACENTER_PROXY') {
      summaryNarrative = '[VPN/데이터센터 프록시] ' + locStr + ' 대역의 클라우드 프록시 또는 VPN 출구 노드에서 유입된 무-GPU 인덱싱 세션입니다.';
    } else if (persona === 'HEADLESS_SCRAPER') {
      summaryNarrative = '[데이터센터 크롤러] ' + locStr + ' 대역에서 GPU 가속 없이 벤치마크 및 문서를 순회한 데이터센터 인덱싱 봇 세션입니다.';
    } else if (persona === 'SOFTWARE_ENGINEER') {
      const gpuStr = footprint.webglRenderer ? footprint.webglRenderer.slice(0, 40) : '표준 그래픽스';
      summaryNarrative = '[개발자/엔지니어 환경] ' + locStr + '에서 개발자 전용 폰트(' + devFontMatches.slice(0, 2).join(', ') + ') 및 ' + gpuStr + ' 환경으로 접근한 고관여 엔지니어링 세션입니다.';
    } else if (persona === 'POWER_USER') {
      summaryNarrative = '[코어 사용자] ' + locStr + '에서 ' + visitCount + '회 이상 반복 방문하며 에코시스템 문서를 집중 탐색한 충성 방문자 세션입니다.';
    } else {
      summaryNarrative = '[일반 방문자] ' + locStr + '에서 유입되어 표준 브라우저 환경에서 페이지를 열람한 사용자 세션입니다.';
    }

    return {
      visitorId: footprint.visitorId,
      persona,
      confidence: Math.round(confidence * 100) / 100,
      riskLevel,
      tags,
      summaryNarrative,
      detailedReasons: reasons,
      evaluatedAt: new Date().toISOString()
    };
  }
}

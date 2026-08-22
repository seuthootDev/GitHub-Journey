# GitHub Journey — Visualize Your Developer Journey
1. 프로젝트 개요

GitHub Journey는 GitHub 활동 데이터를 분석하여 개발자가 GitHub에서 어떤 기술을 사용했고, 어떤 활동을 했으며, 시간이 지나면서 어떤 방향으로 변화했는지를 시각적으로 보여주는 프로젝트다.

기존 GitHub Stats 프로젝트들이 주로 현재 시점의 커밋 수, Repository 수, Stars, Contributions 등의 정적 통계를 보여주는 것과 달리, GitHub Journey는 시간에 따른 변화와 개발 활동의 흐름을 핵심으로 한다.

GitHub Stats tells you where you are.
GitHub Journey tells you how you got there.

2. 프로젝트 목표
핵심 목표

GitHub 사용자 한 명의 활동을 연도별로 분석하여 다음을 보여준다.

어떤 프로그래밍 언어를 사용했는가
어떤 Framework / Library를 사용했는가
얼마나 많은 프로젝트를 만들었는가
Commit 활동은 어떻게 변화했는가
PR / Issue / Review 등의 협업 활동은 어떻게 변화했는가
Open Source 활동이 언제부터 증가했는가
특정 기술을 얼마나 지속적으로 사용했는가
기술의 폭(Breadth)과 깊이(Depth)가 어떻게 변화했는가
각 시기에 어떤 개발 활동의 특징이 나타났는가
전체 기간을 통합했을 때 어떤 Developer Journey를 거쳤는가
3. 핵심 컨셉

단순히:

2024년 Commit 500개

를 보여주는 것이 아니라,

2024 — Backend Development

처럼 데이터를 해석한다.

예:

2022
Explorer
│
│  Java
│  Python
│  JavaScript
│
▼
2023
Backend Builder
│
│  Python
│  FastAPI
│  PostgreSQL
│
▼
2024
Application Developer
│
│  TypeScript
│  React
│  Node.js
│
▼
2025
Open Source Contributor
│
│  External PRs
│  Code Reviews
│  Multiple repositories
│
▼
2026
Open Source Builder

즉 통계 → 분석 → 변화 → Journey의 구조를 가진다.

4. 분석 기간

기본적으로 사용자의 GitHub 활동 중 최근 5년을 분석한다.

예:

2022 ── 2023 ── 2024 ── 2025 ── 2026

단, GitHub 계정 생성 시점이나 데이터 부족에 따라 실제 분석 가능한 기간만 사용한다.

추후 옵션으로:

3 Years
5 Years
10 Years
All Time

을 지원할 수 있다.

5. 연도별 분석 데이터

각 연도에 대해 다음 데이터를 수집한다.

5.1 Programming Languages
Python
JavaScript
TypeScript
Java
C/C++
Go
Rust
C#
Kotlin
Swift
기타

단순 사용 여부보다 사용량과 지속성을 중요하게 본다.

예:

2022
Python      ██████████
Java        ███████
JavaScript  ███

2023
Python      ████████████
JavaScript  █████
TypeScript  ████

2024
Python      █████████
TypeScript  ███████████
Rust        ██

이를 통해 Technology Evolution을 생성한다.

6. Framework / Library 분석

Repository의 dependency 파일 등을 분석하여 Framework와 주요 Library를 추출한다.

예:

Python
├── FastAPI
├── Django
├── PySide
└── Flask

JavaScript / TypeScript
├── React
├── Next.js
├── Node.js
└── NestJS

사용자의 기술 스택이 어떻게 확장되었는지 분석한다.

예:

2023년 Python 기반 Backend Framework 사용 증가

2024년 TypeScript / React 기반 Web Development 확장

7. Repository 분석

연도별로:

생성한 Repository
활성 Repository
Archive Repository
Repository 유지 기간
프로젝트 규모
프로젝트 활동량

등을 분석한다.

특히 Repository의 수보다 지속적인 프로젝트 개발 여부를 중요하게 본다.

예:

2022
12 repositories
9 short-term projects
2 long-lived projects

2025
8 repositories
3 short-term projects
5 long-lived projects

이런 경우:

Project Ownership increased

같은 분석 이벤트를 생성할 수 있다.

8. Commit 분석

Commit 수 자체를 개발 능력으로 해석하지 않는다.

대신:

활동 빈도
활동 기간
활동이 특정 프로젝트에 집중되는지
지속적인 개발인지
특정 기간에 집중된 활동인지

를 분석한다.

예:

2024

Active Months     11 / 12
Commit Days       142
Longest Streak    31 days

이를 통해:

Development Consistency

라는 역량 지표를 만들 수 있다.

9. PR / Collaboration 분석

협업 능력을 나타내는 중요한 지표.

분석 대상:

PR 생성
PR Merge
External Repository PR
Review
Issue
Discussion
외부 프로젝트 참여

특히 본인 Repository와 외부 Repository를 구분한다.

예:

2022
Own PRs       12
External PRs   0

2024
Own PRs       18
External PRs   7

2026
Own PRs       24
External PRs  31

그러면:

2024 — Started contributing beyond personal projects

와 같은 Journey Event를 만들 수 있다.

10. Developer Capability Model

수집된 데이터를 바로 "개발 실력"으로 표현하지 않고 GitHub에서 관찰 가능한 활동 역량으로 분류한다.

초기 버전에서는 다음 8개 축을 사용한다.

Coding
Technology
Project
Collaboration
Open Source
Consistency
Breadth
Depth

각 항목은 0~100으로 정규화한다.

예:

2025

Coding          82
Technology      87
Project         79
Collaboration   71
Open Source     68
Consistency     84
Breadth         76
Depth           81

중요한 점은 이것이 개발자의 실제 실력 점수는 아니라는 것이다.

README에는 명확하게:

These scores represent observable GitHub activity patterns, not actual engineering ability.

라고 명시한다.

11. 연도별 "주요 변화" 추출

각 연도의 점수 자체보다 전년도와 비교한 변화량을 분석한다.

예:

2024 → 2025

Coding          +4
Technology      +8
Project         +3
Collaboration  +19
Open Source    +27
Consistency     +5
Breadth         +2
Depth           +7

변화량이 큰 영역을 기반으로 해당 연도의 특징을 추출한다.

예:

2025

PRIMARY DEVELOPMENT:
Open Source

SECONDARY:
Collaboration

TECHNOLOGY:
Python
TypeScript
React

KEY EVENTS:
+12 external PRs
+3 long-lived projects
+27 Open Source score
12. Rule Engine

이 프로젝트의 핵심 분석 엔진.

AI 대신 명시적인 규칙 기반 시스템을 사용한다.

예:

Technology Explorer
IF

new_languages >= 3
AND technology_breadth > threshold

THEN

Explorer
Specialist
IF

same_language_usage >= 2 years
AND technology_depth > threshold
AND technology_breadth < threshold

THEN

Specialist
Builder
IF

owned_repositories_active > threshold
AND long_lived_projects > threshold

THEN

Builder
Open Source Contributor
IF

external_prs > threshold
AND external_repositories > threshold

THEN

Open Source Contributor
Collaborator
IF

reviews + external_prs + issues
increase significantly

THEN

Collaborator

이렇게 설명 가능한 규칙으로 만든다.

13. Journey Event

연도별 분석 결과를 단순한 숫자로 끝내지 않고 Journey Event로 변환한다.

예:

2022
────────────────
Explorer

Experimented with multiple technologies.

Technologies:
Java · Python · JavaScript
2023
────────────────
Backend Builder

Backend development became a major focus.

Technologies:
Python · FastAPI · PostgreSQL

+42% Backend-related activity
2024
────────────────
Open Source Contributor

External collaboration became a significant part
of your GitHub activity.

7 external PRs
12 reviews
14. 전체 Journey 생성

5개의 연도 프로필을 연결하여 전체 여정을 만든다.

예:

2022
Explorer
   │
   ▼
2023
Backend Builder
   │
   ▼
2024
Application Developer
   │
   ▼
2025
Open Source Contributor
   │
   ▼
2026
Open Source Builder

그리고 최종적으로:

Your Developer Journey

You started by exploring multiple technologies, gradually focused on backend development, and later expanded into open-source collaboration and project ownership.

와 같은 결과를 생성한다.

단, 이 문장 자체도 Rule Engine에서 Template 방식으로 생성할 수 있다.

15. AI 사용 여부
기본값: AI 없음

전체 분석은:

GitHub API
 ↓
Data Processing
 ↓
Metrics
 ↓
Capability Analysis
 ↓
Rule Engine
 ↓
Journey

으로 완전히 처리한다.

따라서:

API 비용 없음
LLM API Key 불필요
결과 재현 가능
분석 결과 설명 가능
GitHub Actions에서도 실행 가능

이라는 장점이 있다.

향후 선택적 AI

나중에 사용자가 원할 경우:

Journey Data
     ↓
   LLM
     ↓
Natural Language Summary

를 추가한다.

AI는 판단자가 아니라 설명자 역할만 한다.

16. 최종 결과물

GitHub Journey의 핵심 결과는 SVG가 되는 것이 좋다.

예:

┌──────────────────────────────────────────┐
│          MY GITHUB JOURNEY               │
│                                          │
│  2022        2023        2024       2026 │
│   │           │           │          │   │
│ Explorer → Backend → Contributor → Builder
│                                          │
│ ──────────────────────────────────────── │
│                                          │
│ Technology Evolution                     │
│ Python █████████████████                 │
│ TypeScript       ███████████             │
│ Java       █████                           │
│                                          │
│ Open Source                              │
│ ▁▁▂▂▃▃▅▆████                             │
│                                          │
│ Projects                                 │
│  3 → 7 → 12 → 18                         │
└──────────────────────────────────────────┘

README에서는:

![GitHub Journey](https://...)

한 줄로 사용할 수 있도록 한다.

17. MVP

처음부터 모든 데이터를 넣으면 너무 커지므로 MVP는 4개 영역으로 시작하는 게 좋다.

MVP v0.1

1. Languages

2. Repositories

3. Commits

4. Pull Requests

그리고:

Yearly Metrics
        ↓
Year-over-Year Change
        ↓
Rule Engine
        ↓
Journey Events
        ↓
SVG

까지만 구현.

Framework / Library / dependency 분석은 v0.2 이후.

18. 향후 확장
v0.2
Framework detection
Library detection
Technology timeline
Repository longevity
v0.3
External contributions
Reviews
Issues
Open Source score
v0.4
Developer archetypes
Journey path
More visualization styles
v0.5
GitHub Actions 자동 생성
Dynamic SVG
Custom themes
v1.0
AI-generated natural language summary
3 / 5 / 10 year analysis
Interactive web visualization
19. 프로젝트 차별성

기존 GitHub Stats:

What are your GitHub statistics?

GitHub Activity:

What are you doing on GitHub?

GitHub Timeline:

What happened on GitHub?

GitHub Journey:

How has your development journey changed over time?

이 차이를 프로젝트의 핵심 메시지로 가져간다.

20. Repository 구성

나는 레포 이름은 **github-journey**로 하는 걸 추천해.

GitHub repository 이름에:

GitHub Journey — Visualize Your Developer Journey

처럼 긴 문장을 넣는 것보다는 프로젝트 식별자는 짧게 가져가는 게 좋음.

추천

Repository

github-journey

Project Title

GitHub Journey

Tagline

Visualize Your Developer Journey

Description

Visualize how your development journey has evolved through GitHub.

README 최상단은:

GitHub Journey

Visualize Your Developer Journey

이렇게 가져가면 됨.

그리고 github-journey라는 이름 자체도 GitHub + Journey라는 프로젝트의 핵심 개념을 그대로 전달해서 꽤 좋다.

한 줄로 정리하면

이 프로젝트는 "GitHub Stats를 하나 더 만드는 것"이 아니라, GitHub에서 관찰 가능한 데이터를 연도별로 분석해서 Data → Capability → Events → Journey로 변환하는 개발자 활동 분석/시각화 엔진으로 잡는 게 가장 좋다.

그리고 AI 없이도 완성도 있는 결과가 나오도록 Rule Engine을 먼저 설계하는 게 핵심

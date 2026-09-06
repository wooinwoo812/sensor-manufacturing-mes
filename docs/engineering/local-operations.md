# 로컬 실행과 운영 준비

이 문서는 로컬 개발과 단기 공개 포트폴리오 운영 안내다. 2026-09-06 Lightsail 공개 데모 배포를 검증했다. 이미 다른 세션이 개발 서버를 사용하고 있다면 먼저 상태를 확인하고 임의 종료·재시드하지 않는다.

## 기본 개발 설정

| 대상       | 기본 주소·위치                          | 확인할 내용                                   |
| ---------- | --------------------------------------- | --------------------------------------------- |
| 웹         | `http://localhost:5173`                 | Vite, /api만 API로 proxy                      |
| API        | `http://localhost:3000/api/health`      | NestJS /api prefix                            |
| PostgreSQL | localhost:5432                          | compose의 postgres 서비스와 영속 volume       |
| 설정 예시  | [.env.example](../../.env.example)      | 실제 비밀값은 저장소·스크린샷에 노출하지 않음 |
| 실행 명령  | [루트 package.json](../../package.json) | web·api·db 명령의 원문                        |

위 표는 저장소의 기본값이며 현재 실행 중인 서버나 이 PC의 실제 DB 포트를 보장하지 않는다. 실제 환경변수와 수신 포트를 확인하되 비밀값을 문서·로그에 출력하지 않는다.

브라우저 origin은 WEB_ORIGIN 설정과 맞춘다. localhost와 127.0.0.1을 무심코 혼용하면 세션 cookie나 Origin 검증 결과가 달라질 수 있다.

## 새 개발 환경 준비

Node·pnpm 버전은 [.node-version](../../.node-version)과 package.json의 packageManager를 따른다. 먼저 의존성 설치, DB 기동·연결 확인, 필요한 migration·가상 계정 준비 상태를 확인한 후 개발 서버를 시작한다. 기존 DB에는 아래 절차를 무조건 반복하지 않는다.

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm db:up
corepack pnpm db:check
corepack pnpm dev
```

migration과 seed가 필요한 경우 대상 DB와 보존할 데이터부터 확인한다. db:migrate, db:migrate:deploy, db:seed는 읽기 전용 명령이 아니다. 운영 데이터를 대상으로 안내용 seed를 실행하지 않는다.

## 서버가 중복으로 보일 때

1. 5173과 3000의 실제 수신 프로세스, 명령행과 시작한 배치를 읽기 전용으로 확인한다.
2. 웹과 API의 실행 주체를 구분한다. watch 프로세스 수가 곧 정상 서버 수는 아니다.
3. 다른 작업자가 사용 중인지 확인한 뒤 정리할 정확한 프로세스를 합의한다.
4. 포트를 바꾸거나 프로세스를 재시작했다면 웹 proxy와 WEB_ORIGIN도 대조한다.

과거 PID나 배치 이름을 현재 상태로 단정하지 않는다. 같은 GET 중복 호출 문제와 서버 배치 중복 실행 문제는 별개다.

## 오류를 좁히는 순서

| 증상             | 확인 순서                                                     |
| ---------------- | ------------------------------------------------------------- |
| 웹 접속 불가     | Vite 프로세스 → 5173 수신 → 브라우저 콘솔                     |
| API 연결 실패    | API health → 3000 프로세스 → Vite proxy → API 로그            |
| 로그인 실패      | API 응답 code → DB 연결 → 가상 계정 준비 → Origin 설정        |
| 401              | 세션 만료·종료 여부와 로그인 복귀                             |
| 403              | 실제 역할 권한, Origin, CSRF를 구분                           |
| 목록 없음        | 조회조건과 데이터 존재 확인. 빈 결과와 서버 오류를 구분       |
| 데이터 변경 충돌 | 오류 code·대상 번호·현재 상태 확인. 명령을 자동 반복하지 않음 |

## 외부 Node 호스팅용 설정

프런트엔드 빌드와 API를 하나의 Node 서비스에서 제공한다. 공개 주소의 `/api/*`는 NestJS가 처리하고, `/login`·작업 상세 등은 React 앱을 제공한다. 별도 프런트엔드 도메인이나 CORS 설정은 필요하지 않다. 현재 공개 배포는 아래 Lightsail 구성을 사용하며, 이 절의 설정은 일반 Node 호스팅에도 적용할 수 있다.

| 항목 | 값 |
| --- | --- |
| 저장소 루트 | 프로젝트 최상위 디렉터리 |
| Node 버전 | `.node-version` 기준 |
| 빌드 명령 | `corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm build` |
| 시작 명령 | `corepack pnpm db:migrate:deploy && corepack pnpm start` |
| 상태 확인 경로 | `/api/health` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | 배포용 PostgreSQL 연결 문자열. 호스팅의 비밀 환경변수로 설정 |
| `WEB_ORIGIN` | 실제 공개 HTTPS origin. 경로·마지막 슬래시 없이 설정 |
| `PORT` | 호스팅이 주입한 값 사용. 없으면 `API_PORT`, 최종 기본값 3000 |
| `WEB_DIST_DIR` | 기본 `apps/web/dist`. 별도 배치에서만 절대 경로로 지정 |

Render가 주입하는 `RENDER_EXTERNAL_URL`도 `WEB_ORIGIN`을 지정하지 않았을 때 사용할 수 있다. 운영 모드에서 DB 주소나 HTTPS origin이 빠지면 서버 시작을 거부한다. 웹 빌드 파일과 DB 연결을 확인한 뒤 포트를 연다. API와 누락된 정적 파일은 React HTML로 덮어쓰지 않으며, HTML은 재검증하도록 캐시한다.

새 배포용 DB에 migration을 적용한 뒤, **비어 있는 가상 데모 전용 DB임을 확인한 경우에만** `corepack pnpm db:seed`와 `corepack pnpm --filter @sensor-mes/api db:demo`를 한 번 실행한다. 기존 seed는 자재 예약 등을 재작성하므로 시작 명령에 넣지 않는다. 재시작·재배포 때는 migration만 적용하고 이미 변경된 데모 데이터를 유지한다. 로컬 DB를 공개 서버로 연결하지 않는다.

## Lightsail 단일 서버 구성

개인 포트폴리오의 단기 운영을 위해 서울 리전의 `micro_3_0`(1GB, Linux, 월 $7) 한 대에 앱과 PostgreSQL을 함께 둔다. 별도 관리형 DB는 사용하지 않는다. 월 요금은 세전이며 추가 snapshot·트래픽 초과분은 별도다. 임시 주소의 sslip.io는 IP를 이름으로 연결하는 DNS 서비스이며 앱과 DB는 AWS 서버에 있다.

| 항목 | 설정 |
| --- | --- |
| 인스턴스 / 고정 IP 리소스 | `fabriscope-mes` / `fabriscope-mes-ip` |
| 임시 공개 주소 | `https://fabriscope.43-200-28-31.sslip.io` |
| 기반 OS | Ubuntu 24.04 LTS |
| 배포 정의 | [compose.yaml](../../deploy/lightsail/compose.yaml), [Dockerfile](../../deploy/lightsail/Dockerfile) |
| HTTPS | Caddy 자동 인증서 발급·갱신, 정적 파일·API 같은 origin |
| 서버 환경변수 | `/opt/fabriscope/.env`, 소유자만 읽기 가능, 저장소·이미지에 포함하지 않음 |
| 실행 경로 | `/opt/fabriscope/current` → 검증된 release 디렉터리 |
| 메모리 | API 384MiB, PostgreSQL 256MiB, Caddy 128MiB 제한, 호스트 swap 2GiB |
| DB 연결 | 하나의 DatabaseModule을 공유, `DB_POOL_MAX=5`, PostgreSQL 최대 연결 30 |
| DB 저장 | Docker named volume. PostgreSQL 포트는 인터넷에 공개하지 않음 |
| 운영 종료 검토일 | 2026-10-06. 자동 삭제 예약은 아님 |

웹·API는 로컬에서 빌드한 결과물을 전송한다. 서버의 maintenance 이미지는 고정된 lockfile로 Linux 의존성과 migration·seed 도구를 준비하고, 실행 이미지는 개발 의존성을 제외한다. 실행 중인 API에서 빌드·시드를 실행하지 않는다. Lightsail의 초기화 스크립트는 `/bin/sh`로 실행될 수 있으므로 [bootstrap.sh](../../deploy/lightsail/bootstrap.sh)는 POSIX shell 문법을 사용한다.

서버에서 사용할 명령은 다음과 같다. `maintenance`는 일회성 도구이며 상시 실행하지 않는다.

```bash
cd /opt/fabriscope/current
dc() { sudo docker compose --env-file /opt/fabriscope/.env -f deploy/lightsail/compose.yaml "$@"; }
dc ps
dc logs --tail 50 api
dc --profile tools run --rm maintenance node node_modules/prisma/build/index.js migrate deploy
dc up -d --wait api caddy
```

첫 배포 때만 public schema에 테이블이 없는 새 DB인지 확인하고 migration, 기본 seed, 대표 사례 생성 순으로 실행한다. 기존 DB에 시드를 반복하지 않는다. 데모 계정은 방문자별 세션을 발급하지만 업무 데이터는 모두 공유한다. 방문자가 실행한 검사·작업 결과는 이후 방문자에게도 보인다.

### GitHub Actions 자동 배포

[CI workflow](../../.github/workflows/ci.yml)는 PR에서 품질 검사를 실행하고, `main` push 또는 `main`의 수동 실행에서 검사에 통과한 동일 빌드 결과물을 Lightsail에 배포한다. GitHub Actions의 **CI → Run workflow → main**으로 재배포할 수 있다. 로컬 파일만 수정한 상태는 배포되지 않으며 PR을 main에 병합해야 한다.

- 코드·문서·TypeScript·테스트·실제 PostgreSQL 회귀 검사·빌드를 통과한 뒤 배포 파일을 만든다.
- [package-release.sh](../../deploy/lightsail/package-release.sh)는 명시한 파일만 묶는다. 환경변수·개인키·로컬 DB는 제외하며 결과물은 GitHub에 1일 보관한다.
- [github-deploy.sh](../../deploy/lightsail/github-deploy.sh)는 OIDC 역할과 Lightsail의 임시 SSH 키를 사용한다. 저장소에 장기 AWS access key나 SSH private key를 등록하지 않는다.
- IAM 신뢰 조건은 이 저장소의 `main`만 허용하고, 권한은 이 인스턴스의 임시 접속 정보 조회와 방화벽 열기·닫기로 제한한다. 실제 배포는 서버의 Ubuntu 계정 및 Docker 관리 권한으로 실행된다.
- runner의 IPv4 `/32`에만 SSH를 임시 허용하고 EXIT 처리와 `always()` 단계에서 닫는다. runner 강제 종료처럼 후처리 자체가 실행되지 않으면 Lightsail의 22번 규칙에 남은 runner IP를 정리해야 한다.
- [deploy-release.sh](../../deploy/lightsail/deploy-release.sh)는 서버 잠금, Linux 이미지 빌드, DB dump와 목록 검증, migration, 앱·Caddy 상태 및 공개 HTTPS 검증 순으로 실행한다. DB 서비스와 데이터 volume은 재생성하지 않으며 seed는 실행하지 않는다.
- `/version.json`의 commit이 배포 SHA와 같을 때만 `/opt/fabriscope/current`를 새 release로 바꾼다. 앱 교체 이후 실패하면 이전 이미지와 Caddy 설정으로 복구한다.

배포 권한 역할은 `fabriscope-github-deploy`, 저장소 변수는 `LIGHTSAIL_DEPLOY_ROLE_ARN`이다. [신뢰 정책](../../deploy/lightsail/iam-trust.json)과 [권한 정책](../../deploy/lightsail/iam-policy.json)을 코드로 보존한다. 서버를 새로 만들면 instance ARN을 갱신해야 한다.

**DB migration은 자동 역변환하지 않는다.** 이전 앱에서도 읽을 수 있는 호환 migration을 사용하고, 파괴적인 schema 변경은 별도 배포 계획을 세운다. 백업은 `/opt/fabriscope/backups/before-<release>.dump`에 보관하며 전체 DB 복원은 운영자가 데이터 영향을 확인한 뒤 수행한다. 이전 이미지·release·백업은 보존하고 여유 공간이 2GiB 미만이면 기존 앱을 유지한 채 배포를 중단한다.

### 공개 서버 검증 기록 — 2026-09-06

- HTTPS 인증서 검증, HTTP→HTTPS 이동, React 상세 경로, JS gzip 전송, 누락 API·정적 파일의 404를 확인했다.
- 다섯 역할 로그인·세션, 역할별 접근 제한, `Secure`·`HttpOnly`·`SameSite=Lax` cookie, Origin·CSRF 거절을 확인했다.
- 가상 계정 5개와 대표 사례 4개를 새 DB에 생성했고, 브라우저에서 보류 작업 상세의 후속 공정 차단을 확인했다.
- 실제 서버 대상으로 1·5·10명 동시 로그인·조회 시나리오를 실행했다. 인증 조회 총 640회가 성공했고 테스트 세션 21개를 로그아웃했다.

| 동시 방문자 | 조회 수 | 조회 p95 | 로그인 p95 |
| --- | ---: | ---: | ---: |
| 1명 | 40 | 46ms | 97ms |
| 5명 | 200 | 40ms | 236ms |
| 10명 | 400 | 65ms | 393ms |

수치는 작은 데모 데이터에서 화면 조회와 세션 확인을 함께 요청하고 300ms 후 반복한 짧은 측정이다. 인터넷·TLS 왕복을 포함하며 브라우저 렌더 시간이나 장시간 최대 처리량을 뜻하지 않는다. 측정 후 API·DB·Caddy의 재시작과 OOM은 없었다. 유휴 요청이 없어도 서비스는 자동 절전하지 않는다.

초기 DB의 custom-format dump를 `/opt/fabriscope/backups/initial-20260906.dump`에 저장하고 `pg_restore --list`로 읽을 수 있음을 확인했다. 이 검사는 별도 DB로 전체 복원을 완료했다는 의미가 아니다.

### 한 달 운영 후 종료

Lightsail은 중지 상태에서도 요금이 발생한다. 사용자가 종료를 결정하면 필요한 DB를 먼저 내려받고, 이 배포의 인스턴스를 삭제한 뒤 고정 IP를 해제한다. 별도로 만든 snapshot·디스크·DB가 있다면 그 목록도 확인한다. 아래 삭제 명령은 배포 과정에서 자동 실행하지 않는다.

```bash
# 먼저 서버에서 DB 백업 파일을 만든 뒤 로컬로 내려받는다.
dc exec -T postgres pg_dump -U sensor_mes -d sensor_mes -Fc > sensor_mes.dump

# 데이터 보존을 확인한 후 로컬 AWS CLI에서 실행한다.
aws lightsail delete-instance --instance-name fabriscope-mes --profile wiw --region ap-northeast-2
aws lightsail release-static-ip --static-ip-name fabriscope-mes-ip --profile wiw --region ap-northeast-2
aws lightsail delete-key-pair --key-pair-name fabriscope-20260906 --profile wiw --region ap-northeast-2
```

## 운영 범위와 남은 확인

- 공개 포트폴리오의 HTTPS·same-origin·cookie·Origin은 검증했다. 실제 제조 운영 서비스의 가용성 검증과는 범위가 다르다.
- 기존 운영 DB 업그레이드, 백업의 전체 복원, 장애 복구와 이전 이미지로의 rollback은 별도 검증이 필요하다.
- 서버 환경변수와 DB dump는 저장소나 공개 웹 경로에 두지 않는다. Docker 로그 크기는 제한하며 상시 외부 관측 서비스는 추가하지 않았다.
- CI의 일회성 DB 종료 명령을 사용자 DB 정리 절차로 복사하지 않는다.

현재 CI 작업의 정의는 [ci.yml](../../.github/workflows/ci.yml)이다. 설정 파일 존재와 최신 실행 성공은 다른 근거이며, 로컬 빌드 통과를 배포 완료로 표현하지 않는다.

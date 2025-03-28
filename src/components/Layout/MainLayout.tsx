import { defineComponent, ref, onMounted, Teleport, computed, watch, Transition, onBeforeUnmount, Fragment } from "vue";
import { useEventListener } from "@vueuse/core";
import { useState } from "@/hooks/state";
import styles from "./Layout.module.scss";
import fullscreen from "@/helpers/fullscreen";
import Tooltip from "@/components/Tooltip/Tooltip";
import Setting from "./Setting";
import SearchChapters from "./SearchChapters";
import { useRouter } from "vue-router";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faSignInAlt,
  faUserPlus,
  faSignOutAlt,
  faBookmark, // Tambahkan ikon bookmark
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const SIDBAR_MENU: Array<{ icon: string, label: string, route: string }> = [
    {
        icon: "/assets/svg/home.svg",
        label: "general.home-page",
        route: "home"
    },
    // {
    //     icon: "/assets/svg/quran.svg",
    //     label: "general.hafalan",
    //     route: "hafalan"
    // }
];

export default defineComponent({
    props: {
        fixed: {
            type: Boolean,
            default: false
        },
        showScrollIndicator: {
            type: Boolean,
            default: false
        },
        class: {
            type: String,
            default: ""
        },
        showNavbar: {
            type: Boolean,
            default: true
        },
        showFooter: {
            type: Boolean,
            default: true
        }
    },
    setup(props) {
        const state = useState();
        const router = useRouter();
        const isFullscreen = ref<boolean>(fullscreen.isFullscreen());
        const scrollProgress = ref<number>(0);
        const navbar = ref<HTMLElement | null>(null);
        const showSetting = ref<boolean>(false);
        const showSearchChapters = ref<boolean>(false);
        const isLoggedIn = ref<boolean>(false); // State untuk menyimpan status login

        // Ref untuk mengatur visibilitas navbar berdasarkan aktivitas scroll
        const isNavbarVisible = ref<boolean>(true);
        let hideNavbarTimeout: number | null = null;

        // Cek status login saat komponen dimount
        onMounted(() => {
            const loggedIn = localStorage.getItem("isLoggedIn");
            if (loggedIn === "true") {
                isLoggedIn.value = true;
            }
        });

        // Fungsi untuk logout
        function logout() {
            isLoggedIn.value = false;
            localStorage.removeItem("isLoggedIn");
            router.push({ name: "login" });
        }

        // Fungsi untuk navigasi ke halaman bookmark
        function gotoBookmark() {
            router.push({ name: "bookmark" });
        }

        fullscreen.onFullscreenChange((isFs: boolean) => {
            isFullscreen.value = isFs;
        });

        const showSidebar = computed<boolean>({
            set(value) {
                state.set("SHOW_SIDEBAR", value);
            },
            get() {
                return state.get("SHOW_SIDEBAR", false);
            }
        });

        let oldScroll: number = 0;

        function handleScroll() {
            if (props.showScrollIndicator) {
                let width = 100;
                const scrollHeight = document.documentElement.scrollHeight;
                const clientHeight = document.documentElement.clientHeight;
                const navbarHeight = (navbar.value?.offsetHeight || 0);

                if ((scrollHeight - clientHeight) >= 1) {
                    width = ((window.scrollY / (scrollHeight - clientHeight - navbarHeight - 30)) * 100);
                }

                scrollProgress.value = width;
            }

            if (props.fixed) {
                if (oldScroll - window.scrollY < 0) {
                    navbar.value?.classList.add(styles.navbar_minimize);
                    document.body.setAttribute("data-navbar-minimize", "true");
                } else {
                    navbar.value?.classList.remove(styles.navbar_minimize);
                    document.body.removeAttribute("data-navbar-minimize");
                }
            }

            // Tampilkan navbar saat scroll dan set timer untuk menyembunyikannya jika tidak ada aktivitas scroll selama 5 detik
            if (hideNavbarTimeout !== null) {
                clearTimeout(hideNavbarTimeout);
            }
            isNavbarVisible.value = true;
            hideNavbarTimeout = window.setTimeout(() => {
                isNavbarVisible.value = false;
            }, 10000000);

            oldScroll = window.scrollY;
        }

        onMounted(() => {
            useEventListener(window, "scroll", handleScroll);
        });

        onBeforeUnmount(() => {
            if (hideNavbarTimeout !== null) {
                clearTimeout(hideNavbarTimeout);
            }
        });

        watch(showSidebar, (isShown) => {
            if (isShown) {
                document.body.classList.add("sidebar-open");
            } else {
                document.body.classList.remove("sidebar-open");
            }
        });

        function gotoRoute(name: string) {
            router.push({ name }).then(() => {
                setTimeout(() => showSidebar.value = false, 100);
            });
        }

        return {
            isFullscreen,
            scrollProgress,
            navbar,
            showSetting,
            showSearchChapters,
            showSidebar,
            gotoRoute,
            isLoggedIn,
            logout,
            gotoBookmark,
            isNavbarVisible // expose untuk digunakan di render
        }
    },
    render() {
        return (
            <Fragment>
                <nav class={["sidebar", { close: !this.showSidebar }, this.class]}>
                    <ul class="sidebar-menu">
                        {SIDBAR_MENU.map((item, key) => (
                            <li
                                key={key}
                                class={["menu-link", { active: this.$route.name == item.route }]}
                                onClick={() => this.gotoRoute(item.route)}
                            >
                                <div>
                                    <div class="menu-link-icon">
                                        <img src={item.icon} />
                                    </div>
                                    <div class="menu-link-text">
                                        {this.$t(item.label)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </nav>
                {this.isNavbarVisible && this.showNavbar && (
                    <nav ref="navbar" class={[
                        "navbar",
                        styles.navbar,
                        this.$setting.isDarkMode ? "bg-body-tertiary" : "bg-white",
                        { "sticky-top": this.fixed }
                    ]}>
                        <div class="container-fluid">
                            <div class="vw-100">
                                <div class="ps-1 pe-1">
                                    <div class="d-flex align-items-center justify-content-between mb-2">
                                        <div class="d-flex align-items-center h-100">
                                            <div class={["me-1", styles.nav_menu_item]} onClick={() => this.showSidebar = !this.showSidebar}>
                                                <Transition
                                                    enterActiveClass="animate__animated animate__rubberBand"
                                                    leaveActiveClass="animate__animated animate__bounceOut"
                                                    mode="out-in"
                                                >
                                                    {this.showSidebar ? (
                                                        <font-awesome-icon key={0} icon="bars-staggered" class={styles.icon} style="--animate-duration: .2s" />
                                                    ) : (
                                                        <font-awesome-icon key={1} icon="bars" class={styles.icon} style="--animate-duration: .4s" />
                                                    )}
                                                </Transition>
                                            </div>
                                            <router-link to="/">
                                                <div class={styles.nav_app_logo}>
                                                    <img src="/assets/img/qurani.png" alt={this.$config.APP_NAME} />
                                                </div>
                                            </router-link>
                                        </div>
                                        <div>
                                            <div class="d-flex">
                                                {/* Tombol bookmark */}
                                                <div
                                                    class={["me-2", styles.nav_menu_item]}
                                                    onClick={this.gotoBookmark}
                                                >
                                                    <Tooltip title="Bookmark">
                                                        <font-awesome-icon
                                                            icon={faBookmark}
                                                            class={styles.icon}
                                                        />
                                                    </Tooltip>
                                                </div>

                                                {this.isLoggedIn ? (
                                                    // Tombol Logout jika sudah login
                                                    <div
                                                        class={["me-2", styles.nav_menu_item]}
                                                        onClick={this.logout}
                                                    >
                                                        <Tooltip title="Logout">
                                                            <font-awesome-icon
                                                                icon={faSignOutAlt}
                                                                class={styles.icon}
                                                            />
                                                        </Tooltip>
                                                    </div>
                                                    
                                                ) : (
                                                    // Tombol Login jika belum login (atau tombol friend sesuai route "friend")
                                                    <Fragment>
                                                        <div
                                                            
                                                            onClick={() => this.gotoRoute("friend")}
                                                        >                                                        
                                                        </div>
                                                    </Fragment>
                                                )}
                                                <div class={["me-0", styles.nav_menu_item]} onClick={() => this.showSearchChapters = true}>
                                                    <Tooltip title={this.$t("general.search-surah")}>
                                                        <font-awesome-icon icon="search" class={styles.icon} />
                                                    </Tooltip>
                                                </div>
                                                <div class={["me-2", styles.nav_menu_item]} onClick={() => this.showSetting = true}>
                                                    <Tooltip title={this.$t("general.setting")}>
                                                        <font-awesome-icon icon="gear" class={styles.icon} />
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {this.$slots.navSection?.()}

                                    {this.showScrollIndicator && (
                                        <Teleport to="body" disabled={this.fixed}>
                                            <div class="ps-2 pe-2">
                                                <div class={["progress h-5-px", { "position-fixed sticky-top top-0 start-0 w-100 border-radius-0 z-index-1090": !this.fixed }]}>
                                                    <div
                                                        class="progress-bar"
                                                        role="progressbar"
                                                        aria-valuemax="100"
                                                        aria-valuemin="0"
                                                        aria-valuenow={String(this.scrollProgress)}
                                                        style={{ width: `${this.scrollProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </Teleport>
                                    )}
                                </div>
                            </div>
                        </div>
                    </nav>
                )}
                <div class="main-content">
                    <div class="container-fluid mt-5">
                        {this.$slots.default?.()}
                    </div>
                </div>

                <Teleport to="body">
                    <Setting v-model:show={this.showSetting} />
                    <SearchChapters v-model:show={this.showSearchChapters} />
                </Teleport>

                {this.showFooter && this.$slots.footer?.()}
            </Fragment>
        );
    }
});

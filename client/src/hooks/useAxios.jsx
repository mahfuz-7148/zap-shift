import axios from "axios";

const axiosInstance = axios.create({
    baseURL: `https://zap-shift-28h44444.vercel.app`
})

const useAxios = () => {
    return axiosInstance;
};

export default useAxios;
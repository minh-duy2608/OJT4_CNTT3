package com.example.demo.service;

import com.example.demo.dto.request.CreateReturnRequest;
import com.example.demo.dto.request.ProcessReturnRequest;
import com.example.demo.dto.response.PageResponse;
import com.example.demo.dto.response.ReturnResponse;
import com.example.demo.entity.ReturnStatus;

public interface ReturnService {

    ReturnResponse createReturnRequest(Long orderId, CreateReturnRequest request, String currentUsername);

    PageResponse<ReturnResponse> getMyReturns(int page, int size, String currentUsername);

    ReturnResponse getReturnDetail(Long returnId, String currentUsername);

    PageResponse<ReturnResponse> getShopReturns(Long shopId, ReturnStatus status, int page, int size, String currentUsername);

    ReturnResponse processShopReturn(Long shopId, Long returnId, ProcessReturnRequest request, String currentUsername);

    PageResponse<ReturnResponse> getAdminReturns(ReturnStatus status, int page, int size, String currentUsername);

    ReturnResponse adminProcessReturn(Long returnId, ProcessReturnRequest request, String currentUsername);
}
